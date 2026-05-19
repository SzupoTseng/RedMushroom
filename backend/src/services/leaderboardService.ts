import { getDb } from '../db/database';

export interface LeaderRow {
  user_id: number;
  display_name: string;
  current_level: number;
  total_exp: number;
  streak_days: number;
}

export class LeaderboardService {
  private db = getDb();

  /**
   * Top-N classmates by total_exp (tie-breaker: streak_days).
   * Non-requester names are masked to first-char + 同學 for kid-safe privacy.
   */
  forClass(classId: string, requesterId: number, limit = 20): LeaderRow[] {
    const rows = this.db
      .prepare(
        `SELECT user_id, display_name, current_level, total_exp, streak_days
         FROM users
         WHERE class_id = ? AND role = 'student'
         ORDER BY total_exp DESC, streak_days DESC
         LIMIT ?`
      )
      .all(classId, limit) as LeaderRow[];

    return rows.map((r) =>
      r.user_id === requesterId
        ? r
        : { ...r, display_name: maskName(r.display_name) }
    );
  }
}

function maskName(name: string): string {
  if (!name) return '同學';
  const first = [...name][0] ?? '';
  return `${first}同學`;
}
