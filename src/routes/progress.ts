import { Router, Response } from 'express';
import { Types } from 'mongoose';
import { User, DayProgress, QuizResult, MockTestResult } from '../models/index.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();
router.use(authMiddleware);

// ─── GET /api/progress ────────────────────────────────────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const uid = new Types.ObjectId(req.userId!);
    const [dayRows, quizRows, mockRow, userDoc] = await Promise.all([
      DayProgress.find({ user_id: uid }).sort({ skill: 1, day: 1 }),
      QuizResult.find({ user_id: uid }).sort({ taken_at: -1 }),
      MockTestResult.findOne({ user_id: uid }).sort({ taken_at: -1 }),
      User.findById(uid).select('selected_path selected_skill current_day dark_mode notifications'),
    ]);

    // Group completed days by skill
    const progress: Record<string, { completedDays: number[] }> = {};
    for (const row of dayRows) {
      if (!progress[row.skill]) progress[row.skill] = { completedDays: [] };
      progress[row.skill].completedDays.push(row.day);
    }

    // Group quiz results as skill_dayN → result (first/latest per key)
    const quizResults: Record<string, { score: number; total: number; passed: boolean }> = {};
    for (const row of quizRows) {
      const key = `${row.skill}_day${row.day}`;
      if (!quizResults[key]) {
        quizResults[key] = { score: row.score, total: row.total, passed: row.passed };
      }
    }

    const mockTestResult = mockRow
      ? {
          score: mockRow.score,
          total: mockRow.total,
          accuracy: mockRow.accuracy,
          timeTaken: mockRow.time_taken,
          weakAreas: mockRow.weak_areas,
        }
      : null;

    res.json({
      progress,
      quizResults,
      mockTestResult,
      settings: userDoc ?? {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch progress' });
  }
});

// ─── POST /api/progress/day ───────────────────────────────────────────────────
router.post('/day', async (req: AuthRequest, res: Response): Promise<void> => {
  const { skill, day } = req.body as { skill?: string; day?: number };
  if (!skill || typeof day !== 'number') {
    res.status(400).json({ error: 'skill and day are required' });
    return;
  }
  try {
    const uid = new Types.ObjectId(req.userId!);
    await DayProgress.updateOne(
      { user_id: uid, skill, day },
      { $setOnInsert: { completed_at: new Date() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save day progress' });
  }
});

// ─── POST /api/progress/settings ─────────────────────────────────────────────
router.post('/settings', async (req: AuthRequest, res: Response): Promise<void> => {
  const {
    selectedPath, selectedSkill, currentDay, darkMode, notificationsEnabled,
  } = req.body as {
    selectedPath?: string;
    selectedSkill?: string;
    currentDay?: number;
    darkMode?: boolean;
    notificationsEnabled?: boolean;
  };

  try {
    const update: Record<string, unknown> = {};
    if (selectedPath       !== undefined) update.selected_path  = selectedPath;
    if (selectedSkill      !== undefined) update.selected_skill = selectedSkill;
    if (currentDay         !== undefined) update.current_day    = currentDay;
    if (darkMode           !== undefined) update.dark_mode      = darkMode;
    if (notificationsEnabled !== undefined) update.notifications = notificationsEnabled;

    await User.findByIdAndUpdate(req.userId!, { $set: update });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not save settings' });
  }
});

export default router;
