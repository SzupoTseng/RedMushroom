import { getDb } from '../db/database';

interface CompareInput {
  challenger_score: number;
  challenger_secs: number;
  pvp_target_score: number;
  pvp_target_secs: number;
}

export interface Peer {
  user_id: number;
  display_name: string;
  current_level: number;
}

export class PvpService {
  private db = getDb();

  /**
   * Create a PvP challenge "session row" with a target score & duration drawn
   * from the user's own historical median (so kids always race themselves).
   */
  createChallenge(
    userId: number,
    theoryType: string,
    subject = 'chinese'
  ): { session_id: number; pvp_target_score: number; pvp_target_secs: number } {
    const recent = this.db
      .prepare(
        `SELECT total_score, duration_seconds
         FROM quiz_sessions
         WHERE user_id = ? AND theory_type = ? AND is_passed = 1
         ORDER BY start_time DESC LIMIT 5`
      )
      .all(userId, theoryType) as Array<{
        total_score: number;
        duration_seconds: number | null;
      }>;

    const validScores = recent.map((r) => r.total_score).filter((n) => n != null);
    const validSecs = recent
      .map((r) => r.duration_seconds ?? 0)
      .filter((n) => n > 0);

    const score = validScores.length > 0 ? Math.max(60, median(validScores)) : 70;
    const secs = validSecs.length > 0 ? Math.max(60, median(validSecs)) : 240;

    const result = this.db
      .prepare(
        `INSERT INTO quiz_sessions
           (user_id, subject, theory_type, pvp_mode, pvp_target_score, pvp_target_secs)
         VALUES (?, ?, ?, 1, ?, ?)`
      )
      .run(userId, subject, theoryType, score, secs);

    return {
      session_id: result.lastInsertRowid as number,
      pvp_target_score: score,
      pvp_target_secs: secs,
    };
  }

  classmates(userId: number): Peer[] {
    const me = this.db
      .prepare(`SELECT class_id FROM users WHERE user_id = ?`)
      .get(userId) as { class_id: string | null } | undefined;
    if (!me?.class_id) return [];
    return this.db
      .prepare(
        `SELECT user_id, display_name, current_level
         FROM users
         WHERE class_id = ? AND user_id <> ? AND role = 'student'
         ORDER BY total_exp DESC
         LIMIT 50`
      )
      .all(me.class_id, userId) as Peer[];
  }

  compareResult(i: CompareInput): 'challenger' | 'target' | 'tie' {
    const challengerWeight = i.challenger_score - i.challenger_secs / 10;
    const targetWeight = i.pvp_target_score - i.pvp_target_secs / 10;
    if (Math.abs(challengerWeight - targetWeight) < 1) return 'tie';
    return challengerWeight > targetWeight ? 'challenger' : 'target';
  }
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
