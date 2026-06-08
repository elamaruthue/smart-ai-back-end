import { Router, Response, Request } from 'express';
import { Types } from 'mongoose';
import { QuizResult, MockTestResult, Question } from '../models/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/quiz/questions?skill=X&day=N ───────────────────────────────────
// Returns questions from the Question Set Manager for the given skill + day
router.get('/questions', async (req: Request, res: Response): Promise<void> => {
  const { skill, day } = req.query as { skill?: string; day?: string };

  if (!skill || !day) {
    res.status(400).json({ error: 'skill and day query params are required' });
    return;
  }

  try {
    const questions = await Question.find({ skill, day: Number(day) })
      .select('question option_a option_b option_c option_d answer explanation')
      .sort({ createdAt: 1 });
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ─── POST /api/quiz ───────────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { skill, day, score, total } = req.body as {
    skill?: string;
    day?: number;
    score?: number;
    total?: number;
  };

  if (!skill || typeof day !== 'number' || typeof score !== 'number' || typeof total !== 'number') {
    res.status(400).json({ error: 'skill, day, score and total are required' });
    return;
  }

  if (score < 0 || score > total || total <= 0) {
    res.status(400).json({ error: 'Invalid score values' });
    return;
  }

  const passed = score >= Math.ceil(total * 0.6);

  try {
    await QuizResult.create({ user_id: new Types.ObjectId(req.userId!), skill, day, score, total, passed });
    res.status(201).json({ ok: true, passed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save quiz result' });
  }
});

// ─── POST /api/quiz/mock ──────────────────────────────────────────────────────
router.post('/mock', async (req: AuthRequest, res: Response): Promise<void> => {
  const { score, total, accuracy, timeTaken, weakAreas } = req.body as {
    score?: number;
    total?: number;
    accuracy?: number;
    timeTaken?: number;
    weakAreas?: string[];
  };

  if (
    typeof score !== 'number' ||
    typeof total !== 'number' ||
    typeof accuracy !== 'number' ||
    typeof timeTaken !== 'number' ||
    !Array.isArray(weakAreas)
  ) {
    res.status(400).json({ error: 'score, total, accuracy, timeTaken and weakAreas are required' });
    return;
  }

  try {
    await MockTestResult.create({
      user_id: new Types.ObjectId(req.userId!),
      score,
      total,
      accuracy: parseFloat(accuracy.toFixed(2)),
      time_taken: timeTaken,
      weak_areas: weakAreas,
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save mock test result' });
  }
});

export default router;
