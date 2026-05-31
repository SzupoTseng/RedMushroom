import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database';

const BCRYPT_ROUNDS = 12;

interface UserRow {
  user_id: number;
  username: string;
  password_hash: string;
  display_name: string;
  role: string;
  grade: string;
  total_exp: number;
  reward_points: number;
  current_level: number;
  streak_days: number;
  max_streak: number;
  is_sen_mode: number;
  question_level: number;
}

export async function register(req: Request, res: Response): Promise<void> {
  const { username, password, display_name, grade, role = 'student' } = req.body as {
    username?: string;
    password?: string;
    display_name?: string;
    grade?: string;
    role?: string;
  };

  if (!username || !password) {
    res.status(400).json({ error: '帳號與密碼為必填' });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: '密碼至少需要 6 個字元' });
    return;
  }
  if (!['student', 'teacher', 'parent'].includes(role)) {
    res.status(400).json({ error: '角色設定無效' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT user_id FROM users WHERE username = ?').get(username);
  if (existing) {
    res.status(409).json({ error: '帳號已存在' });
    return;
  }

  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const result = db.prepare(
    `INSERT INTO users (username, password_hash, display_name, grade, role)
     VALUES (?, ?, ?, ?, ?)`
  ).run(username, hash, display_name ?? username, grade ?? '3', role);

  // 同時建立 user_stats 與 user_sprites 紀錄
  const userId = result.lastInsertRowid as number;
  db.prepare('INSERT OR IGNORE INTO user_stats (user_id) VALUES (?)').run(userId);
  db.prepare('INSERT OR IGNORE INTO user_sprites (user_id) VALUES (?)').run(userId);

  res.status(201).json({ message: '註冊成功', user_id: userId });
}

export async function login(req: Request, res: Response): Promise<void> {
  const { username, password } = req.body as { username?: string; password?: string };

  if (!username || !password) {
    res.status(400).json({ error: '帳號與密碼為必填' });
    return;
  }

  const db = getDb();
  const user = db.prepare(
    `SELECT user_id, username, password_hash, display_name, role, grade,
            total_exp, reward_points, current_level, streak_days, max_streak, is_sen_mode,
            question_level
     FROM users WHERE username = ?`
  ).get(username) as UserRow | undefined;

  if (!user) {
    res.status(401).json({ error: '帳號或密碼錯誤' });
    return;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    res.status(401).json({ error: '帳號或密碼錯誤' });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ error: '伺服器設定錯誤' });
    return;
  }

  const token = jwt.sign(
    { user_id: user.user_id, username: user.username, role: user.role },
    secret,
    { expiresIn: '7d' }
  );

  res.json({
    token,
    user: {
      user_id: user.user_id,
      username: user.username,
      display_name: user.display_name,
      role: user.role,
      grade: user.grade,
      total_exp: user.total_exp,
      reward_points: user.reward_points,
      current_level: user.current_level,
      streak_days: user.streak_days,
      max_streak: user.max_streak,
      is_sen_mode: user.is_sen_mode === 1,
      question_level: user.question_level ?? 0,
    },
  });
}

export function getMe(req: Request, res: Response): void {
  const db = getDb();
  const userId = req.user!.user_id;

  const user = db.prepare(
    `SELECT u.user_id, u.username, u.display_name, u.role, u.grade,
            u.total_exp, u.reward_points, u.current_level, u.streak_days, u.max_streak, u.is_sen_mode,
            u.question_level,
            s.accuracy, s.stability, s.versatility, s.cognition, s.endurance, s.fluency
     FROM users u
     LEFT JOIN user_stats s ON s.user_id = u.user_id
     WHERE u.user_id = ?`
  ).get(userId) as Record<string, unknown> | undefined;

  if (!user) {
    res.status(404).json({ error: '使用者不存在' });
    return;
  }

  res.json({ user });
}

/**
 * PATCH /api/auth/me — 學生更新個人資料。
 * 接受任一欄位（皆 optional）：
 *   - display_name: 1–12 字，僅中文 / 英數字 / 空白
 *   - question_level: 0 或 1（出題模式：0=重複練習、1=多樣化）
 */
export function updateMe(req: Request, res: Response): void {
  const db = getDb();
  const userId = req.user!.user_id;
  const { display_name, question_level } = req.body as {
    display_name?: string;
    question_level?: number;
  };

  const updates: string[] = [];
  const params: (string | number)[] = [];
  const response: Record<string, unknown> = { ok: true };

  if (typeof display_name === 'string') {
    const trimmed = display_name.trim();
    if (trimmed.length < 1 || trimmed.length > 12) {
      res.status(400).json({ error: '姓名長度需為 1–12 字' });
      return;
    }
    if (!/^[一-鿿A-Za-z0-9 ]+$/.test(trimmed)) {
      res.status(400).json({ error: '姓名只允許中文、英文、數字、空白' });
      return;
    }
    updates.push('display_name = ?');
    params.push(trimmed);
    response.display_name = trimmed;
  }

  if (typeof question_level === 'number') {
    if (question_level !== 0 && question_level !== 1) {
      res.status(400).json({ error: 'question_level 只允許 0 或 1' });
      return;
    }
    updates.push('question_level = ?');
    params.push(question_level);
    response.question_level = question_level;
  }

  if (updates.length === 0) {
    res.status(400).json({ error: '請至少提供一個可更新欄位' });
    return;
  }

  params.push(userId);
  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`).run(...params);
  res.json(response);
}
