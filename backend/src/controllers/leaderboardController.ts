import type { Request, Response } from 'express';
import { LeaderboardService } from '../services/leaderboardService';
import { getDb } from '../db/database';

const svc = new LeaderboardService();

export function getLeaderboard(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  try {
    const me = getDb()
      .prepare(`SELECT class_id FROM users WHERE user_id = ?`)
      .get(userId) as { class_id: string | null } | undefined;

    if (!me?.class_id) {
      res.json({ class_id: null, rows: [] });
      return;
    }
    res.json({ class_id: me.class_id, rows: svc.forClass(me.class_id, userId) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}
