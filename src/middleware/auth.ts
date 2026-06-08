import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  userId?:   string;
  userRole?: string;
}

const JWT_SECRET = process.env.JWT_SECRET ?? 'change_this_secret';

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; role?: string };
    req.userId   = payload.userId;
    req.userRole = payload.role ?? 'user';
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/** Allows only the listed roles. Chain after authMiddleware. */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    console.log('Checking roles', { required: roles, userRole: req.userRole });
    if (!req.userRole || !roles.includes(req.userRole)) {
      res.status(403).json({ error: 'Access forbidden: insufficient role' });
      return;
    }
    next();
  };
}

export function signToken(userId: string, role = 'user'): string {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}
