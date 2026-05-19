import { getDb } from '../db/database';

/**
 * SM-2-lite spaced-repetition scheduler.
 * Hours until the next review at each streak level.
 * After streak_correct reaches 3, the monster is "purified" and stops appearing.
 */
const REVIEW_INTERVALS_HOURS = [6, 24, 72, 168, 336];

interface MonsterRow {
  question_id: number;
  streak_correct: number;
  next_review_time: string;
  content: unknown;
  options: Record<string, string>;
  theory_type: string;
}

export class ErrorMonsterService {
  private db = getDb();

  /**
   * Call after every quiz/review answer. Creates, updates, or purifies the
   * user's monster for this question depending on correctness.
   */
  onAnswered(userId: number, questionId: number, isCorrect: boolean): void {
    const db = this.db;
    const existing = db
      .prepare(
        `SELECT id, streak_correct, status
         FROM user_error_monsters
         WHERE user_id = ? AND question_id = ?`
      )
      .get(userId, questionId) as
      | { id: number; streak_correct: number; status: string }
      | undefined;

    if (!existing) {
      if (isCorrect) return; // never been wrong, don't track
      db.prepare(
        `INSERT INTO user_error_monsters
           (user_id, question_id, streak_correct, status, next_review_time)
         VALUES (?, ?, 0, 'active', datetime('now', '+6 hours'))`
      ).run(userId, questionId);
      return;
    }

    if (existing.status === 'purified') return;

    if (isCorrect) {
      const newStreak = existing.streak_correct + 1;
      if (newStreak >= 3) {
        db.prepare(
          `UPDATE user_error_monsters
           SET streak_correct = ?, status = 'purified'
           WHERE id = ?`
        ).run(newStreak, existing.id);
      } else {
        const hours =
          REVIEW_INTERVALS_HOURS[Math.min(newStreak, REVIEW_INTERVALS_HOURS.length - 1)];
        db.prepare(
          `UPDATE user_error_monsters
           SET streak_correct = ?,
               next_review_time = datetime('now', '+' || ? || ' hours')
           WHERE id = ?`
        ).run(newStreak, hours, existing.id);
      }
    } else {
      db.prepare(
        `UPDATE user_error_monsters
         SET streak_correct = 0,
             next_review_time = datetime('now', '+6 hours')
         WHERE id = ?`
      ).run(existing.id);
    }
  }

  /**
   * Return up to 20 active monsters whose next_review_time has passed,
   * with their question content/options parsed.
   */
  dueForUser(userId: number): MonsterRow[] {
    const rows = this.db
      .prepare(
        `SELECT m.question_id, m.streak_correct, m.next_review_time,
                q.content, q.options, q.theory_type
         FROM user_error_monsters m
         JOIN questions q ON q.question_id = m.question_id
         WHERE m.user_id = ?
           AND m.status = 'active'
           AND m.next_review_time <= datetime('now')
         ORDER BY m.next_review_time
         LIMIT 20`
      )
      .all(userId) as Array<{
        question_id: number;
        streak_correct: number;
        next_review_time: string;
        content: string;
        options: string;
        theory_type: string;
      }>;

    return rows.map((r) => ({
      question_id: r.question_id,
      streak_correct: r.streak_correct,
      next_review_time: r.next_review_time,
      content: JSON.parse(r.content),
      options: JSON.parse(r.options) as Record<string, string>,
      theory_type: r.theory_type,
    }));
  }
}
