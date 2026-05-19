import { getDb } from '../db/database';

export class DashboardService {
  private db = getDb();

  getTeacherDashboard(teacherId: number): unknown {
    const db = this.db;

    // 老師的班級
    const teacher = db
      .prepare('SELECT class_id FROM users WHERE user_id = ?')
      .get(teacherId) as { class_id: string | null } | undefined;

    const classId = teacher?.class_id;

    const students = classId
      ? (db
          .prepare(
            `SELECT u.user_id, u.username, u.display_name, u.grade,
                    u.current_level, u.total_exp, u.streak_days,
                    s.accuracy, s.stability, s.versatility, s.cognition, s.endurance
             FROM users u
             LEFT JOIN user_stats s ON s.user_id = u.user_id
             WHERE u.class_id = ? AND u.role = 'student'
             ORDER BY u.total_exp DESC`
          )
          .all(classId) as Array<Record<string, unknown>>)
      : [];

    // 全班本週測驗次數
    const weeklyQuizCount = classId
      ? (db
          .prepare(
            `SELECT count(*) as cnt FROM quiz_sessions qs
             JOIN users u ON u.user_id = qs.user_id
             WHERE u.class_id = ? AND qs.start_time >= datetime('now', '-7 days')`
          )
          .get(classId) as { cnt: number })
      : { cnt: 0 };

    return { students, weekly_quiz_count: weeklyQuizCount.cnt };
  }

  getClassStats(teacherId: number): unknown {
    const db = this.db;
    const teacher = db
      .prepare('SELECT class_id FROM users WHERE user_id = ?')
      .get(teacherId) as { class_id: string | null } | undefined;

    const classId = teacher?.class_id;
    if (!classId) return [];

    const stats = db
      .prepare(
        `SELECT q.theory_type,
                COUNT(*) as total,
                SUM(qd.is_correct) as correct
         FROM quiz_details qd
         JOIN questions q ON q.question_id = qd.question_id
         JOIN quiz_sessions qs ON qs.session_id = qd.session_id
         JOIN users u ON u.user_id = qs.user_id
         WHERE u.class_id = ?
         GROUP BY q.theory_type`
      )
      .all(classId);

    return stats;
  }

  exportCsv(teacherId: number): { csv: string; filename: string } {
    const db = this.db;
    const teacher = db
      .prepare('SELECT class_id FROM users WHERE user_id = ?')
      .get(teacherId) as { class_id: string | null } | undefined;

    const classId = teacher?.class_id ?? '';

    const rows = db
      .prepare(
        `SELECT u.username, u.display_name, u.grade,
                u.current_level, u.total_exp, u.streak_days,
                s.accuracy, s.cognition, s.endurance
         FROM users u
         LEFT JOIN user_stats s ON s.user_id = u.user_id
         WHERE u.class_id = ? AND u.role = 'student'
         ORDER BY u.total_exp DESC`
      )
      .all(classId) as Array<Record<string, unknown>>;

    const header = '帳號,姓名,年級,等級,總經驗,連勝天數,正確率,認知,耐力';
    const lines = rows.map((r) =>
      [
        r.username, r.display_name, r.grade, r.current_level, r.total_exp,
        r.streak_days, r.accuracy ?? 0, r.cognition ?? 0, r.endurance ?? 0,
      ].join(',')
    );

    const csv = [header, ...lines].join('\n');
    const filename = `class_${classId}_${Date.now()}.csv`;
    return { csv, filename };
  }
}
