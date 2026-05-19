import type { Request, Response } from 'express';
import { ErrorMonsterService } from '../services/errorMonsterService';
import { getDb } from '../db/database';

const svc = new ErrorMonsterService();

export function listDue(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  try {
    res.json({ monsters: svc.dueForUser(userId) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}

export function reviewMonster(req: Request, res: Response): void {
  const userId = req.user!.user_id;
  const { question_id, user_answer } = req.body as {
    question_id?: number;
    user_answer?: string;
  };

  if (!question_id || user_answer === undefined) {
    res.status(400).json({ error: '缺少必要欄位' });
    return;
  }

  try {
    const q = getDb()
      .prepare(`SELECT correct_answer, explanation FROM questions WHERE question_id = ?`)
      .get(question_id) as { correct_answer: string; explanation: string } | undefined;
    if (!q) {
      res.status(404).json({ error: '找不到題目' });
      return;
    }
    const isCorrect = user_answer.trim() === q.correct_answer.trim();
    svc.onAnswered(userId, question_id, isCorrect);
    res.json({ is_correct: isCorrect, explanation: q.explanation });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(400).json({ error: msg });
  }
}
