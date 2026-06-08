import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load .env from the backend directory regardless of cwd
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env') });

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import mongoose from 'mongoose';
import { connectDB } from './src/db.js';
import { authMiddleware } from './src/middleware/auth.js';
import authRoutes      from './src/routes/auth.js';
import progressRoutes  from './src/routes/progress.js';
import quizRoutes      from './src/routes/quiz.js';
import courseDataRoutes from './src/routes/courseData.js';
import questionRoutes  from './src/routes/questions.js';

// ─── Validate env ─────────────────────────────────────────────────────────────
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY is missing in backend/.env');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT ?? '4000', 10);

// ─── OpenAI client ────────────────────────────────────────────────────────────
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ─── Express app ──────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:5174', 'http://127.0.0.1:5174'] }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth',      authRoutes);                                    // register & login are public
app.use('/api/progress',  authMiddleware, progressRoutes);
app.use('/api/quiz',      authMiddleware, quizRoutes);
app.use('/api/course',    courseDataRoutes);                               // GET is public; PUT has its own auth
app.use('/api/questions', authMiddleware, questionRoutes);

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  if (dbState === 1) {
    res.json({ status: 'ok', db: 'connected', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'degraded', db: 'unreachable' });
  }
});

// ─── Chat endpoint (SSE streaming) ───────────────────────────────────────────
app.post('/api/chat', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const { messages } = req.body as ChatRequestBody;

  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages array is required' });
    return;
  }

  for (const msg of messages) {
    if (!['user', 'assistant'].includes(msg.role) || typeof msg.content !== 'string') {
      res.status(400).json({ error: 'Invalid message format' });
      return;
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    const stream = openai.beta.chat.completions.stream({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are SmartPrep AI, an expert tutor for Data Analytics and Data Science learners.
You specialise in: Python (Pandas, NumPy, Matplotlib, Scikit-learn), SQL, Excel (VLOOKUP, Pivot Tables),
Power BI, Machine Learning concepts, and Statistics.
Guidelines:
- Give clear, concise answers with code examples when relevant.
- Format code blocks using triple backticks with the language name (e.g. \`\`\`python).
- Keep answers focused and educational – not more than 300 words unless asked for detail.
- If asked something outside your domain, politely redirect to data/analytics topics.`,
        },
        ...messages,
      ],
      max_tokens: 1024,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ delta })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'OpenAI request failed';
    res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    res.end();
  }
});

// ─── Global error handler ─────────────────────────────────────────────────────
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`SmartPrep AI backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  });

