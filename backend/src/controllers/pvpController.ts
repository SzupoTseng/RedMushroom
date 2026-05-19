import type { Request, Response } from 'express';
import { PvpService } from '../services/pvpService';

const svc = new PvpService();

export function classmates(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  try {
    res.json({ peers: svc.classmates(userId) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function createChallenge(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  const { theory_type, subject = 'chinese' } = req.body as {
    theory_type?: string;
    subject?: string;
  };

  if (!theory_type) {
    res.status(400).json({ error: '請提供 theory_type' });
    return;
  }

  try {
    res.json(svc.createChallenge(userId, theory_type, subject));
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}
