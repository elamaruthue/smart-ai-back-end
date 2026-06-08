/**
 * GET  /api/course          – public; returns all course sections
 * PUT  /api/course/:section – superuser/admin only; replaces a section
 */
import { Router, Request, Response } from 'express';
import { CourseContent } from '../models/index.js';
import { authMiddleware, requireRole, AuthRequest } from '../middleware/auth.js';

import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { readFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSeedData() {
  const seedPath = resolve(__dirname, '../../data/courseDataSeed.json');
  try {
    return JSON.parse(readFileSync(seedPath, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const SECTIONS = ['paths', 'skills', 'quizBank', 'interviewQuestions', 'mockTestQuestions'] as const;
type Section = (typeof SECTIONS)[number];

const router = Router();

// ─── GET /api/course ──────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response): Promise<void> => {
  try {
    const docs = await CourseContent.find({ section: { $in: [...SECTIONS] } });

    if (docs.length === SECTIONS.length) {
      const result: Record<string, unknown> = {};
      for (const doc of docs) result[doc.section] = doc.data;
      res.json(result);
      return;
    }

    const seed = loadSeedData();
    if (!seed) {
      res.status(503).json({ error: 'Course data not yet seeded. Run: npx tsx src/seed_course.ts' });
      return;
    }

    const existing = new Set(docs.map((d) => d.section));
    for (const section of SECTIONS) {
      if (existing.has(section)) continue;
      await CourseContent.findOneAndUpdate(
        { section },
        { section, data: seed[section] ?? {} },
        { upsert: true, new: true }
      );
    }

    res.json(seed);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load course data' });
  }
});

// ─── PUT /api/course/:section  (superuser / admin only) ──────────────────────
router.put(
  '/:section',
  authMiddleware,
  requireRole('superuser', 'admin'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { section } = req.params;

    if (!(SECTIONS as readonly string[]).includes(section as string)) {
      res.status(400).json({ error: `Unknown section. Valid: ${SECTIONS.join(', ')}` });
      return;
    }

    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      res.status(400).json({ error: 'Request body must be a JSON object' });
      return;
    }

    try {
      await CourseContent.findOneAndUpdate(
        { section },
        { data: payload, updated_by: req.userId!, updated_at: new Date() },
        { upsert: true, new: true }
      );
      res.json({ ok: true, section });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to save course data' });
    }
  }
);

export default router;
