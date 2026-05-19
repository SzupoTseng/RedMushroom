import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  user_id: number;
  username: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: '未提供授權 Token' });
    return;
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: '伺服器設定錯誤' });
    return;
  }

  try {
    const payload = jwt.verify(token, secret) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Token 無效或已過期' });
  }
}

export function requireRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: '未驗證' });
      return;
    }
    if (req.user.role !== role && req.user.role !== 'teacher') {
      res.status(403).json({ error: '權限不足' });
      return;
    }
    next();
  };
}
