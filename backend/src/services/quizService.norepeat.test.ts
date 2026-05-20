/**
 * 「6 小時內不重複」整合測試：
 * 一個使用者連跑兩場 cognitive 測驗，第二場應該不出現第一場任何一題（題庫足夠時）。
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { QuizService } from './quizService';
import { getDb } from '../db/database';

const USER = 9501;

describe('startQuiz: 6h no-repeat window', () => {
  beforeAll(() => {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO users (user_id, username, password_hash, is_sen_mode)
       VALUES (?, 'norep-user', 'x', 0)`
    ).run(USER);
    // 清掉這個測試使用者之前的所有 session/details
    db.prepare(`DELETE FROM quiz_details WHERE session_id IN
      (SELECT session_id FROM quiz_sessions WHERE user_id = ?)`).run(USER);
    db.prepare(`DELETE FROM quiz_sessions WHERE user_id = ?`).run(USER);
  });

  it('the second quiz within 6h contains zero questions from the first', () => {
    const svc = new QuizService();
    const first = svc.startQuiz(USER, 'cognitive', 'chinese');
    expect(first.questions.length).toBe(10);

    // 把第一場全部當作答過（無論對錯，只要進 quiz_details 就算「看過」）
    const db = getDb();
    const stmt = db.prepare(
      `INSERT INTO quiz_details (session_id, question_id, user_answer, is_correct)
       VALUES (?, ?, '1', 0)`
    );
    for (const q of first.questions) stmt.run(first.session_id, q.question_id, );

    // 馬上開第二場 — 應該完全不出現第一場任何題目（cognitive 題庫遠超 10 題）
    const second = svc.startQuiz(USER, 'cognitive', 'chinese');
    expect(second.questions.length).toBe(10);

    const firstIds = new Set(first.questions.map((q) => q.question_id));
    const overlap = second.questions.filter((q) => firstIds.has(q.question_id));
    expect(overlap.length).toBe(0);
  });

  it('falls back to full pool when fresh questions are insufficient', () => {
    // 把使用者「最近 6 小時答過」的題目灌爆——應該不報錯，而是回退讓他繼續做題
    const db = getDb();
    const allCognitive = db
      .prepare(`SELECT question_id FROM questions WHERE subject='chinese' AND theory_type='cognitive'`)
      .all() as Array<{ question_id: number }>;
    const sessionRow = db
      .prepare(`INSERT INTO quiz_sessions (user_id, subject, theory_type) VALUES (?, 'chinese', 'cognitive')`)
      .run(USER);
    const sid = sessionRow.lastInsertRowid as number;
    const stmt = db.prepare(
      `INSERT INTO quiz_details (session_id, question_id, user_answer, is_correct)
       VALUES (?, ?, '1', 0)`
    );
    for (const q of allCognitive) stmt.run(sid, q.question_id);

    const svc = new QuizService();
    const out = svc.startQuiz(USER, 'cognitive', 'chinese');
    // 即使全部都「看過」，使用者仍能繼續做題；題數應為 10
    expect(out.questions.length).toBe(10);
  });
});
