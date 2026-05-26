import { getDb } from '../db/database';

/**
 * SM-2-lite spaced-repetition scheduler.
 * Hours until the next review at each streak level.
 * After streak_correct reaches 3, the monster is "purified" and stops appearing.
 *
 * 注意：第一次答錯的等待從 1 小時開始，讓使用者很快看到怪獸出現；
 * 後續答對才會把間隔拉長到 24/72/168/336 小時。
 */
const REVIEW_INTERVALS_HOURS = [1, 24, 72, 168, 336];
const INITIAL_TRAP_HOURS = 1; // 剛被抓到 / 又答錯時的下次複習間隔

interface MonsterRow {
  question_id: number;
  streak_correct: number;
  next_review_time: string;
  is_due: boolean;
  content: unknown;
  options: Record<string, string>;
  options_zhuyin?: Record<string, Array<{ char: string; pinyin: string }>>;
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
         VALUES (?, ?, 0, 'active', datetime('now', '+' || ? || ' hours'))`
      ).run(userId, questionId, INITIAL_TRAP_HOURS);
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
             next_review_time = datetime('now', '+' || ? || ' hours')
         WHERE id = ?`
      ).run(INITIAL_TRAP_HOURS, existing.id);
    }
  }

  /**
   * 列出使用者所有仍在「active」狀態的怪獸（最多 20 隻）。
   * - 已到複習時間（next_review_time <= now）的怪獸排在前面，標 is_due=true
   * - 還在等待間隔的怪獸也會出現，標 is_due=false 讓 UI 顯示「等待中」
   * 這樣使用者打錯後立刻去看，就會看到剛被抓到的怪獸，不會以為系統壞了。
   */
  dueForUser(userId: number): MonsterRow[] {
    const rows = this.db
      .prepare(
        `SELECT m.question_id, m.streak_correct, m.next_review_time,
                CASE WHEN m.next_review_time <= datetime('now') THEN 1 ELSE 0 END AS is_due,
                q.content, q.options, q.options_zhuyin, q.theory_type
         FROM user_error_monsters m
         JOIN questions q ON q.question_id = m.question_id
         WHERE m.user_id = ?
           AND m.status = 'active'
         ORDER BY is_due DESC, m.next_review_time ASC
         LIMIT 20`
      )
      .all(userId) as Array<{
        question_id: number;
        streak_correct: number;
        next_review_time: string;
        is_due: number;
        content: string;
        options: string;
        options_zhuyin: string | null;
        theory_type: string;
      }>;

    return rows.map((r) => ({
      question_id: r.question_id,
      streak_correct: r.streak_correct,
      next_review_time: r.next_review_time,
      is_due: r.is_due === 1,
      content: JSON.parse(r.content),
      options: JSON.parse(r.options) as Record<string, string>,
      options_zhuyin: r.options_zhuyin
        ? (JSON.parse(r.options_zhuyin) as Record<string, Array<{ char: string; pinyin: string }>>)
        : undefined,
      theory_type: r.theory_type,
    }));
  }
}
