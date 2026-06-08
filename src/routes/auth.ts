import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { signToken, authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  const { username, email, password } = req.body as {
    username?: string;
    email?: string;
    password?: string;
  };

  if (!username || !email || !password) {
    res.status(400).json({ error: 'username, email and password are required' });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters' });
    return;
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email)) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  try {
    const hash = await bcrypt.hash(password, 12);
    const user = await User.create({
      username: username.trim(),
      email: email.toLowerCase().trim(),
      password: hash,
    });

    const token = signToken(user._id.toString(), 'user');
    res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role },
    });
  } catch (err: unknown) {
    const code = (err as { code?: number }).code;
    if (code === 11000) {
      res.status(409).json({ error: 'Email already registered' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' });
    return;
  }

  try {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select(
      'username email password role'
    );

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = signToken(user._id.toString(), user.role ?? 'user');
    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email, role: user.role ?? 'user' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.userId!).select(
      'username email role selected_path selected_skill current_day dark_mode notifications'
    );
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch user' });
  }
});

// ─── PATCH /api/auth/profile ──────────────────────────────────────────────────
router.patch('/profile', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { username } = req.body as { username?: string };
  if (!username || !username.trim()) {
    res.status(400).json({ error: 'username is required' });
    return;
  }
  try {
    await User.findByIdAndUpdate(req.userId!, { username: username.trim() });
    res.json({ ok: true, username: username.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not update profile' });
  }
});

// ─── PATCH /api/auth/password ─────────────────────────────────────────────────
router.patch('/password', authMiddleware, async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'currentPassword and newPassword are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }
  try {
    const user = await User.findById(req.userId!).select('password');
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }
    const hash = await bcrypt.hash(newPassword, 12);
    await User.findByIdAndUpdate(req.userId!, { password: hash });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not change password' });
  }
});

export default router;
