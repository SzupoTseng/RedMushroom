import { getDb } from '../db/database';
import { ErrorMonsterService } from './errorMonsterService';
import { StreakRewardService } from './streakRewardService';

interface QuestionRow {
  question_id: number;
  theory_type: string;
  category_type: string;
  question_type: string;
  content: string;
  options: string;
  correct_answer: string;
  explanation: string;
  score: number;
  subject: string;
}

interface QuestionForClient {
  question_id: number;
  theory_type: string;
  category_type: string;
  question_type: string;
  content: unknown;
  options: Record<string, string>;
  score: number;
  subject: string;
}

// 快取：Map<`${subject}:${theory_type}`, Record<category, question_id[]>>
// 改為按 category 分桶，方便 stratified sampling 確保題目橫跨多個生活情境。
const questionIdCache = new Map<string, Record<string, number[]>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分鐘
const cacheTimestamps = new Map<string, number>();

/**
 * Fisher-Yates 洗牌（in-place）
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export class QuizService {
  private db = getDb();

  getAvailableSubjects(): string[] {
    const rows = this.db
      .prepare('SELECT DISTINCT subject FROM questions')
      .all() as Array<{ subject: string }>;
    return rows.map((r) => r.subject);
  }

  /**
   * 把題目按 category_type 分桶並快取，5 分鐘 TTL。回傳每個 category 的 shuffled IDs。
   */
  private getBucketsByCategory(subject: string, theoryType: string): Record<string, number[]> {
    const key = `${subject}:${theoryType}`;
    const now = Date.now();
    const lastFetch = cacheTimestamps.get(key) ?? 0;

    if (!questionIdCache.has(key) || now - lastFetch > CACHE_TTL_MS) {
      const rows = this.db
        .prepare(
          'SELECT question_id, category_type FROM questions WHERE subject = ? AND theory_type = ?'
        )
        .all(subject, theoryType) as Array<{ question_id: number; category_type: string }>;

      const buckets: Record<string, number[]> = {};
      for (const r of rows) {
        (buckets[r.category_type] ??= []).push(r.question_id);
      }
      questionIdCache.set(key, buckets);
      cacheTimestamps.set(key, now);
    }

    // shallow-clone + shuffle each bucket so callers get a fresh shuffle but cache stays stable
    const cached = questionIdCache.get(key) ?? {};
    const out: Record<string, number[]> = {};
    for (const k of Object.keys(cached)) out[k] = shuffle([...cached[k]]);
    return out;
  }

  /**
   * Stratified sampling: 從每個 category bucket 輪流抽出題目，
   * 確保 N 題涵蓋盡量多的生活情境，而不是全部來自同一個 category。
   */
  private pickDiverseQuestions(buckets: Record<string, number[]>, count: number): number[] {
    const cats = Object.keys(buckets);
    if (cats.length === 0) return [];

    // Round-robin: walk every category, take one ID at a time, repeat until we have `count`.
    const cursors: Record<string, number> = {};
    for (const c of cats) cursors[c] = 0;

    const picked: number[] = [];
    let safety = count * cats.length;
    while (picked.length < count && safety-- > 0) {
      let progressed = false;
      // shuffle category order each pass so the same cat doesn't always go first
      const order = shuffle([...cats]);
      for (const c of order) {
        if (picked.length >= count) break;
        const ids = buckets[c];
        const idx = cursors[c];
        if (idx < ids.length) {
          picked.push(ids[idx]);
          cursors[c] = idx + 1;
          progressed = true;
        }
      }
      if (!progressed) break; // every bucket exhausted
    }
    return picked;
  }

  startQuiz(userId: number, theoryType: string, subject: string): {
    session_id: number;
    questions: QuestionForClient[];
  } {
    const db = this.db;

    // 判斷 SEN 模式題數
    const user = db
      .prepare('SELECT is_sen_mode FROM users WHERE user_id = ?')
      .get(userId) as { is_sen_mode: number } | undefined;
    const questionCount = user?.is_sen_mode ? 5 : 10;

    const buckets = this.getBucketsByCategory(subject, theoryType);
    const totalAvail = Object.values(buckets).reduce((s, ids) => s + ids.length, 0);
    if (totalAvail < questionCount) {
      throw new Error(`題庫不足：${subject}/${theoryType} 只有 ${totalAvail} 題，需要 ${questionCount} 題`);
    }
    const selectedIds = this.pickDiverseQuestions(buckets, questionCount);
    const placeholders = selectedIds.map(() => '?').join(',');
    const questions = db
      .prepare(
        `SELECT question_id, theory_type, category_type, question_type,
                content, options, correct_answer, explanation, score, subject
         FROM questions WHERE question_id IN (${placeholders})`
      )
      .all(...selectedIds) as QuestionRow[];

    // 建立新的 quiz_session
    const sessionResult = db
      .prepare(
        `INSERT INTO quiz_sessions (user_id, subject, theory_type, start_time)
         VALUES (?, ?, ?, datetime('now'))`
      )
      .run(userId, subject, theoryType);

    const sessionId = sessionResult.lastInsertRowid as number;

    // 移除 correct_answer，絕不回傳給前端
    const questionsForClient: QuestionForClient[] = questions.map((q) => ({
      question_id: q.question_id,
      theory_type: q.theory_type,
      category_type: q.category_type,
      question_type: q.question_type,
      content: JSON.parse(q.content),
      options: JSON.parse(q.options) as Record<string, string>,
      score: q.score,
      subject: q.subject,
    }));

    return { session_id: sessionId, questions: questionsForClient };
  }

  submitAnswer(
    userId: number,
    sessionId: number,
    questionId: number,
    userAnswer: string,
    speechText?: string,
    speechScore?: number
  ): { is_correct: boolean; explanation: string } {
    const db = this.db;

    // IDOR 防護：確認 session 屬於此 user
    const session = db
      .prepare('SELECT user_id FROM quiz_sessions WHERE session_id = ?')
      .get(sessionId) as { user_id: number } | undefined;
    if (!session || session.user_id !== userId) {
      throw new Error('無效的 session_id');
    }

    const question = db
      .prepare('SELECT correct_answer, explanation FROM questions WHERE question_id = ?')
      .get(questionId) as { correct_answer: string; explanation: string } | undefined;
    if (!question) {
      throw new Error('找不到題目');
    }

    const isCorrect = userAnswer.trim() === question.correct_answer.trim() ? 1 : 0;

    db.prepare(
      `INSERT INTO quiz_details (session_id, question_id, user_answer, is_correct, speech_text, speech_score)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(sessionId, questionId, userAnswer, isCorrect, speechText ?? null, speechScore ?? null);

    // 語音相似度 ≥ 70% 且答對：額外 +5 XP
    if (isCorrect === 1 && speechScore !== undefined && speechScore >= 70) {
      db.prepare(`UPDATE users SET total_exp = total_exp + 5 WHERE user_id = ?`).run(userId);
    }

    // 錯題怪獸：每次答題後更新間隔重複狀態
    new ErrorMonsterService().onAnswered(userId, questionId, isCorrect === 1);

    return { is_correct: isCorrect === 1, explanation: question.explanation };
  }

  finishQuiz(userId: number, sessionId: number): {
    total_score: number;
    is_passed: boolean;
    exp_gained: number;
    praise: string;
    level_up: boolean;
    new_level: number;
    streak_days: number;
    reward: { name: string; type: 'title' | 'pet_skin' } | null;
  } {
    const db = this.db;

    // IDOR 防護
    const session = db
      .prepare('SELECT user_id, theory_type, subject FROM quiz_sessions WHERE session_id = ?')
      .get(sessionId) as { user_id: number; theory_type: string; subject: string } | undefined;
    if (!session || session.user_id !== userId) {
      throw new Error('無效的 session_id');
    }

    // 計算得分
    const details = db
      .prepare(
        `SELECT d.is_correct, q.score
         FROM quiz_details d
         JOIN questions q ON q.question_id = d.question_id
         WHERE d.session_id = ?`
      )
      .all(sessionId) as Array<{ is_correct: number; score: number }>;

    const totalScore = details.reduce(
      (sum, d) => sum + (d.is_correct ? d.score : 0),
      0
    );
    // Pass threshold is 60% of the per-quiz ceiling. With 10 questions × 10 pts
    // the ceiling is 100 → ≥60 passes (matches CLAUDE.md spec). With SEN's
    // 5 questions × 10 pts the ceiling is 50 → ≥30 passes. This keeps the
    // bar pedagogically equivalent rather than penalising SEN users.
    const maxScore = details.reduce((sum, d) => sum + d.score, 0);
    const passThreshold = Math.ceil(maxScore * 0.6);
    const isPassed = totalScore >= passThreshold ? 1 : 0;

    // 計算測驗時長
    db.prepare(
      `UPDATE quiz_sessions
       SET end_time = datetime('now'),
           total_score = ?,
           is_passed = ?,
           duration_seconds = CAST(
             (julianday(datetime('now')) - julianday(start_time)) * 86400 AS INTEGER
           )
       WHERE session_id = ?`
    ).run(totalScore, isPassed, sessionId);

    // 取得讚美語
    const praise = this.pickPraise(userId, isPassed === 1);

    // RPG 經驗值更新
    const { expGained, levelUp, newLevel } = this.updateExp(userId, totalScore, isPassed === 1);

    // 連勝更新（回傳更新後的天數，給寶箱解鎖判斷使用）
    const newStreak = this.updateStreak(userId, isPassed === 1);
    const reward = new StreakRewardService().unlockIfMilestone(userId, newStreak);

    // 更新五維度統計
    this.updateUserStats(userId);

    // 更新寵物 EXP
    this.updateSpriteExp(userId, session.theory_type, isPassed === 1 ? 30 : 10);

    return {
      total_score: totalScore,
      is_passed: isPassed === 1,
      exp_gained: expGained,
      praise,
      level_up: levelUp,
      new_level: newLevel,
      streak_days: newStreak,
      reward,
    };
  }

  getSessionResult(userId: number, sessionId: number): unknown | null {
    const db = this.db;

    const session = db
      .prepare(
        `SELECT session_id, user_id, theory_type, subject, start_time, end_time,
                total_score, is_passed, duration_seconds
         FROM quiz_sessions WHERE session_id = ?`
      )
      .get(sessionId) as Record<string, unknown> | undefined;

    if (!session || (session.user_id as number) !== userId) {
      return null; // IDOR 防護
    }

    const details = db
      .prepare(
        `SELECT d.question_id, d.user_answer, d.is_correct,
                q.content, q.options, q.correct_answer, q.explanation, q.question_type
         FROM quiz_details d
         JOIN questions q ON q.question_id = d.question_id
         WHERE d.session_id = ?`
      )
      .all(sessionId) as Array<Record<string, unknown>>;

    return { session, details };
  }

  // ───── 私有輔助方法 ─────

  private pickPraise(userId: number, passed: boolean): string {
    const db = this.db;

    const user = db
      .prepare('SELECT is_sen_mode FROM users WHERE user_id = ?')
      .get(userId) as { is_sen_mode: number } | undefined;

    const scenario = user?.is_sen_mode
      ? 'sen_encouragement'
      : passed ? 'passed' : 'failed_encouragement';

    // 排除最近 20 次使用過的讚美
    const recentIds = (
      db
        .prepare(
          `SELECT praise_id FROM user_praise_history
           WHERE user_id = ? ORDER BY used_at DESC LIMIT 20`
        )
        .all(userId) as Array<{ praise_id: number }>
    ).map((r) => r.praise_id);

    const excludeClause =
      recentIds.length > 0
        ? `AND praise_id NOT IN (${recentIds.map(() => '?').join(',')})`
        : '';

    const row = db
      .prepare(
        `SELECT praise_id, content FROM praise_library
         WHERE scenario_type = ? ${excludeClause}
         ORDER BY RANDOM() LIMIT 1`
      )
      .get(scenario, ...recentIds) as { praise_id: number; content: string } | undefined;

    if (row) {
      db.prepare(
        `INSERT INTO user_praise_history (user_id, praise_id) VALUES (?, ?)`
      ).run(userId, row.praise_id);
      return row.content;
    }

    return passed ? '做得很好！繼續加油！' : '沒關係，下次一定可以！';
  }

  private updateExp(
    userId: number,
    score: number,
    passed: boolean
  ): { expGained: number; levelUp: boolean; newLevel: number } {
    const db = this.db;
    const baseExp = Math.floor(score * 0.5);
    const passBonus = passed ? 20 : 0;
    const expGained = baseExp + passBonus;

    const user = db
      .prepare('SELECT total_exp, current_level FROM users WHERE user_id = ?')
      .get(userId) as { total_exp: number; current_level: number };

    const newTotalExp = user.total_exp + expGained;
    // 等級公式：level = floor(sqrt(total_exp / 50)) + 1
    const newLevel = Math.floor(Math.sqrt(newTotalExp / 50)) + 1;
    const levelUp = newLevel > user.current_level;

    db.prepare(
      `UPDATE users SET total_exp = ?, current_level = ? WHERE user_id = ?`
    ).run(newTotalExp, newLevel, userId);

    return { expGained, levelUp, newLevel };
  }

  private updateStreak(userId: number, passed: boolean): number {
    const db = this.db;
    if (!passed) {
      const cur = db
        .prepare('SELECT streak_days FROM users WHERE user_id = ?')
        .get(userId) as { streak_days: number } | undefined;
      return cur?.streak_days ?? 0;
    }

    const user = db
      .prepare('SELECT last_quiz_date, streak_days, max_streak FROM users WHERE user_id = ?')
      .get(userId) as { last_quiz_date: string | null; streak_days: number; max_streak: number };

    const today = new Date().toISOString().slice(0, 10);
    const last = user.last_quiz_date;

    let newStreak = 1;
    if (last) {
      const diff = Math.floor(
        (new Date(today).getTime() - new Date(last).getTime()) / 86400000
      );
      if (diff === 0) {
        newStreak = user.streak_days; // 同一天再答一場：不重複增加
      } else if (diff === 1) {
        newStreak = user.streak_days + 1;
      } else {
        newStreak = 1;
      }
    }

    const maxStreak = Math.max(user.max_streak, newStreak);
    db.prepare(
      `UPDATE users SET last_quiz_date = ?, streak_days = ?, max_streak = ? WHERE user_id = ?`
    ).run(today, newStreak, maxStreak, userId);
    return newStreak;
  }

  private updateUserStats(userId: number): void {
    const db = this.db;

    // 取最近 30 場的作答紀錄計算五維度
    const recent = db
      .prepare(
        `SELECT q.theory_type, d.is_correct
         FROM quiz_details d
         JOIN questions q ON q.question_id = d.question_id
         JOIN quiz_sessions s ON s.session_id = d.session_id
         WHERE s.user_id = ?
         ORDER BY s.start_time DESC
         LIMIT 300`
      )
      .all(userId) as Array<{ theory_type: string; is_correct: number }>;

    const typeStats: Record<string, { correct: number; total: number }> = {
      cognitive: { correct: 0, total: 0 },
      input: { correct: 0, total: 0 },
      usage: { correct: 0, total: 0 },
      sociocultural: { correct: 0, total: 0 },
    };

    for (const r of recent) {
      if (typeStats[r.theory_type]) {
        typeStats[r.theory_type].total++;
        if (r.is_correct) typeStats[r.theory_type].correct++;
      }
    }

    const accuracy =
      recent.length > 0
        ? (recent.filter((r) => r.is_correct).length / recent.length) * 100
        : 0;

    const cognition =
      typeStats.cognitive.total > 0
        ? (typeStats.cognitive.correct / typeStats.cognitive.total) * 100
        : 0;

    const stability = Math.min(100, recent.length); // 作答題數越多越穩定
    const versatility = Object.values(typeStats).filter((t) => t.total > 0).length * 25;
    const endurance =
      typeStats.sociocultural.total > 0
        ? (typeStats.sociocultural.correct / typeStats.sociocultural.total) * 100
        : 0;
    const fluency =
      typeStats.usage.total > 0
        ? (typeStats.usage.correct / typeStats.usage.total) * 100
        : 0;

    db.prepare(
      `INSERT OR REPLACE INTO user_stats
       (user_id, accuracy, stability, versatility, cognition, endurance, fluency, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).run(userId, accuracy, stability, versatility, cognition, endurance, fluency);
  }

  private updateSpriteExp(userId: number, theoryType: string, amount: number): void {
    const db = this.db;
    const colMap: Record<string, string> = {
      cognitive: 'cognitive_exp',
      input: 'input_exp',
      usage: 'usage_exp',
      sociocultural: 'sociocultural_exp',
    };

    const col = colMap[theoryType];
    if (!col) return;

    db.prepare(
      `UPDATE user_sprites SET ${col} = ${col} + ? WHERE user_id = ?`
    ).run(amount, userId);

    // 更新進化形態
    const sprite = db
      .prepare(
        `SELECT cognitive_exp + input_exp + usage_exp + sociocultural_exp AS total_exp
         FROM user_sprites WHERE user_id = ?`
      )
      .get(userId) as { total_exp: number } | undefined;

    if (!sprite) return;

    let form = 'egg';
    if (sprite.total_exp >= 500) form = 'god';
    else if (sprite.total_exp >= 200) form = 'knight';
    else if (sprite.total_exp >= 50) form = 'baby';

    db.prepare(
      `UPDATE user_sprites SET current_form = ? WHERE user_id = ?`
    ).run(form, userId);
  }
}
