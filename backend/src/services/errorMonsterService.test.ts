import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { ErrorMonsterService } from './errorMonsterService';
import { getDb } from '../db/database';

const USER = 9101;
const Q1 = 1;
const Q2 = 2;

describe('ErrorMonsterService', () => {
  beforeAll(() => {
    getDb()
      .prepare(`INSERT OR REPLACE INTO users (user_id, username, password_hash) VALUES (?, 'em-user', 'x')`)
      .run(USER);
  });

  beforeEach(() => {
    getDb().prepare(`DELETE FROM user_error_monsters WHERE user_id = ?`).run(USER);
  });

  it('creates an active monster on first wrong answer', () => {
    new ErrorMonsterService().onAnswered(USER, Q1, false);
    const row = getDb()
      .prepare(`SELECT status, streak_correct FROM user_error_monsters WHERE user_id=? AND question_id=?`)
      .get(USER, Q1) as { status: string; streak_correct: number };
    expect(row.status).toBe('active');
    expect(row.streak_correct).toBe(0);
  });

  it('does not create a monster if the first answer is correct', () => {
    new ErrorMonsterService().onAnswered(USER, Q1, true);
    const row = getDb()
      .prepare(`SELECT * FROM user_error_monsters WHERE user_id=? AND question_id=?`)
      .get(USER, Q1);
    expect(row).toBeUndefined();
  });

  it('increments streak_correct on correct review and stays active', () => {
    const svc = new ErrorMonsterService();
    svc.onAnswered(USER, Q1, false); // create
    svc.onAnswered(USER, Q1, true);  // streak 1
    const row = getDb()
      .prepare(`SELECT streak_correct, status FROM user_error_monsters WHERE user_id=? AND question_id=?`)
      .get(USER, Q1) as { streak_correct: number; status: string };
    expect(row.streak_correct).toBe(1);
    expect(row.status).toBe('active');
  });

  it('purifies the monster after streak_correct reaches 3', () => {
    const svc = new ErrorMonsterService();
    svc.onAnswered(USER, Q1, false);
    svc.onAnswered(USER, Q1, true);
    svc.onAnswered(USER, Q1, true);
    svc.onAnswered(USER, Q1, true);
    const row = getDb()
      .prepare(`SELECT status FROM user_error_monsters WHERE user_id=? AND question_id=?`)
      .get(USER, Q1) as { status: string };
    expect(row.status).toBe('purified');
  });

  it('resets streak on wrong review', () => {
    const svc = new ErrorMonsterService();
    svc.onAnswered(USER, Q1, false);
    svc.onAnswered(USER, Q1, true);
    svc.onAnswered(USER, Q1, false);
    const row = getDb()
      .prepare(`SELECT streak_correct FROM user_error_monsters WHERE user_id=? AND question_id=?`)
      .get(USER, Q1) as { streak_correct: number };
    expect(row.streak_correct).toBe(0);
  });

  it('dueForUser hides monsters whose next_review_time is in the future', () => {
    const svc = new ErrorMonsterService();
    svc.onAnswered(USER, Q2, false);
    getDb()
      .prepare(`UPDATE user_error_monsters
                SET next_review_time = datetime('now', '+1 day')
                WHERE user_id=? AND question_id=?`)
      .run(USER, Q2);
    const due = svc.dueForUser(USER);
    expect(due.find((m) => m.question_id === Q2)).toBeUndefined();
  });
});
