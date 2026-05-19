import { getDb } from '../db/database';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export class ReportService {
  private db = getDb();

  getStudentReport(userId: number): unknown {
    const db = this.db;

    const user = db
      .prepare(
        `SELECT u.user_id, u.username, u.display_name, u.grade, u.current_level,
                u.total_exp, u.streak_days, u.max_streak,
                s.accuracy, s.stability, s.versatility, s.cognition, s.endurance, s.fluency
         FROM users u LEFT JOIN user_stats s ON s.user_id = u.user_id
         WHERE u.user_id = ?`
      )
      .get(userId) as Record<string, unknown> | undefined;

    if (!user) throw new Error('找不到學生');

    const sessions = db
      .prepare(
        `SELECT session_id, theory_type, subject, total_score, is_passed,
                duration_seconds, start_time
         FROM quiz_sessions WHERE user_id = ?
         ORDER BY start_time DESC LIMIT 50`
      )
      .all(userId) as Array<Record<string, unknown>>;

    const errorMonsters = db
      .prepare(
        `SELECT m.question_id, q.content, q.theory_type, m.streak_correct, m.status
         FROM user_error_monsters m
         JOIN questions q ON q.question_id = m.question_id
         WHERE m.user_id = ? AND m.status = 'active'
         ORDER BY m.next_review_time LIMIT 10`
      )
      .all(userId) as Array<Record<string, unknown>>;

    return { user, sessions, errorMonsters };
  }

  generatePdf(userId: number): { pdfBuffer: Buffer; filename: string } {
    const report = this.getStudentReport(userId) as {
      user: Record<string, unknown>;
      sessions: Array<Record<string, unknown>>;
    };

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    doc
      .fontSize(22)
      .text('RedMushroom 學習報告', { align: 'center' })
      .moveDown();

    doc
      .fontSize(14)
      .text(`學生：${report.user.display_name}（${report.user.username}）`)
      .text(`年級：${report.user.grade} 年級`)
      .text(`等級：Lv.${report.user.current_level}  總經驗：${report.user.total_exp}`)
      .text(`連勝天數：${report.user.streak_days}  最高連勝：${report.user.max_streak}`)
      .moveDown();

    doc.fontSize(16).text('最近測驗記錄').moveDown(0.5);
    for (const s of report.sessions.slice(0, 10)) {
      doc
        .fontSize(11)
        .text(
          `${s.start_time} | ${s.theory_type} | 得分：${s.total_score} | ${s.is_passed ? '通過 ✓' : '未通過'}`
        );
    }

    doc.end();

    const pdfBuffer = Buffer.concat(chunks);
    const filename = `report_${userId}_${Date.now()}.pdf`;
    return { pdfBuffer, filename };
  }

  async generateMobileLinkQr(userId: number): Promise<{
    qr_url: string;
    link_token: string;
    expires_at: string;
  }> {
    const db = this.db;
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // 廢棄舊的 pending token
    db.prepare(
      `UPDATE mobile_linking_tokens SET status = 'expired'
       WHERE user_id = ? AND status = 'pending'`
    ).run(userId);

    db.prepare(
      `INSERT INTO mobile_linking_tokens (user_id, link_token, expires_at)
       VALUES (?, ?, ?)`
    ).run(userId, token, expiresAt);

    const qrData = `redmushroom://link?token=${token}`;
    const qr_url = await QRCode.toDataURL(qrData);

    return { qr_url, link_token: token, expires_at: expiresAt };
  }
}
