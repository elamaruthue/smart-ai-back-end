import { Router, Response } from 'express';
import { Question } from '../models/index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

const router = Router();

// All routes require auth + superuser or admin
router.use(authMiddleware);
router.use(requireRole('superuser', 'admin'));

// ─── GET /api/questions ──────────────────────────────────────────────────────
// Returns all questions, optionally filtered by skill and/or day
router.get('/', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const questions = await Question.find().sort({ skill: 1, day: 1, createdAt: 1 });
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// ─── POST /api/questions ─────────────────────────────────────────────────────
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const { skill, day, question, option_a, option_b, option_c, option_d, answer, explanation } =
    req.body as {
      skill?: string;
      day?: number;
      question?: string;
      option_a?: string;
      option_b?: string;
      option_c?: string;
      option_d?: string;
      answer?: string;
      explanation?: string;
    };

  if (!skill || !day || !question || !option_a || !option_b || !option_c || !option_d || !answer) {
    res.status(400).json({ error: 'skill, day, question, all four options, and answer are required' });
    return;
  }

  if (!['A', 'B', 'C', 'D'].includes(answer)) {
    res.status(400).json({ error: 'answer must be A, B, C, or D' });
    return;
  }

  try {
    const doc = await Question.create({
      skill: skill.trim(),
      day: Number(day),
      question: question.trim(),
      option_a: option_a.trim(),
      option_b: option_b.trim(),
      option_c: option_c.trim(),
      option_d: option_d.trim(),
      answer,
      explanation: explanation?.trim() ?? '',
      created_by: req.userId!,
    });
    res.status(201).json(doc);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// ─── PUT /api/questions/:id ──────────────────────────────────────────────────
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const { skill, day, question, option_a, option_b, option_c, option_d, answer, explanation } =
    req.body as {
      skill?: string;
      day?: number;
      question?: string;
      option_a?: string;
      option_b?: string;
      option_c?: string;
      option_d?: string;
      answer?: string;
      explanation?: string;
    };

  if (answer && !['A', 'B', 'C', 'D'].includes(answer)) {
    res.status(400).json({ error: 'answer must be A, B, C, or D' });
    return;
  }

  try {
    const updated = await Question.findByIdAndUpdate(
      req.params.id,
      {
        ...(skill      && { skill: skill.trim() }),
        ...(day        && { day: Number(day) }),
        ...(question   && { question: question.trim() }),
        ...(option_a   && { option_a: option_a.trim() }),
        ...(option_b   && { option_b: option_b.trim() }),
        ...(option_c   && { option_c: option_c.trim() }),
        ...(option_d   && { option_d: option_d.trim() }),
        ...(answer     && { answer }),
        ...(explanation !== undefined && { explanation: explanation.trim() }),
      },
      { new: true }
    );
    if (!updated) { res.status(404).json({ error: 'Question not found' }); return; }
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// ─── DELETE /api/questions/:id ───────────────────────────────────────────────
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const deleted = await Question.findByIdAndDelete(req.params.id);
    if (!deleted) { res.status(404).json({ error: 'Question not found' }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

export default router;
