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
  options_zhuyin: string | null;
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
  options_zhuyin?: Record<string, Array<{ char: string; pinyin: string }>>;
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

/**
 * 把題目化簡成「題幹」字串：題目文字 + 正解文字。
 * 同一題的多個變體（錯誤選項不同 / 位置不同）會產生同一個 stem，
 * 用於 rotation 與 dedupe，避免同題的 16 個變體被當成 16 道不同的題。
 */
function computeStemKey(row: {
  content: string;
  options: string;
  correct_answer: string;
  question_type: string;
}): string {
  let contentText = row.content;
  try {
    const arr = JSON.parse(row.content) as Array<{ char?: string }>;
    if (Array.isArray(arr)) contentText = arr.map((x) => x.char ?? '').join('');
  } catch { /* keep raw */ }
  let opts: Record<string, string> = {};
  try {
    const parsed = JSON.parse(row.options) as Record<string, string>;
    if (parsed && typeof parsed === 'object') opts = parsed;
  } catch { /* keep empty */ }
  if (row.question_type === 'sorting') {
    const order = (row.correct_answer || '').split(',').map((s) => s.trim()).filter(Boolean);
    return contentText + '||' + order.map((k) => opts[k] ?? '').join('|');
  }
  return contentText + '||' + (opts[(row.correct_answer || '').trim()] ?? '');
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
   * 依「題幹 (stem)」去重：同一題的多個變體只保留一個，其他用同 (subject/theory/category)
   * 中尚未出現過的題幹補足。題幹 = content 文字 + 正解文字。
   * 這樣可以擋掉生成器自動展開的 16 個變體被湊在同一場 quiz 的狀況。
   */
  private deduplicateByContent(ids: number[]): number[] {
    if (ids.length === 0) return ids;
    const db = this.db;
    const stemMap = this.getStemMap();
    const ph = ids.map(() => '?').join(',');
    const rows = db
      .prepare(
        `SELECT question_id, subject, theory_type, category_type
         FROM questions WHERE question_id IN (${ph})`
      )
      .all(...ids) as Array<{
        question_id: number;
        subject: string;
        theory_type: string;
        category_type: string;
      }>;

    const stemSeen = new Set<string>();
    const kept: number[] = [];
    const dropped: typeof rows = [];

    for (const r of rows) {
      const stem = stemMap.get(r.question_id) ?? String(r.question_id);
      if (!stemSeen.has(stem)) {
        stemSeen.add(stem);
        kept.push(r.question_id);
      } else {
        dropped.push(r);
      }
    }

    if (dropped.length === 0) return kept;

    // Fill gaps: 從同 (subject/theory/category) 中挑一個 stem 還沒用過的題目補上
    const alreadyUsed = new Set<number>(ids);
    for (const d of dropped) {
      const alternatives = db
        .prepare(
          `SELECT question_id FROM questions
           WHERE subject = ? AND theory_type = ? AND category_type = ?
             AND question_id NOT IN (${ids.map(() => '?').join(',')})
           LIMIT 200`
        )
        .all(d.subject, d.theory_type, d.category_type, ...ids) as Array<{ question_id: number }>;

      let filled = false;
      for (const alt of shuffle([...alternatives])) {
        if (alreadyUsed.has(alt.question_id)) continue;
        const stem = stemMap.get(alt.question_id) ?? String(alt.question_id);
        if (!stemSeen.has(stem)) {
          stemSeen.add(stem);
          kept.push(alt.question_id);
          alreadyUsed.add(alt.question_id);
          filled = true;
          break;
        }
      }
      if (!filled) {
        // 真的找不到同 category 不同 stem 的 → 退而求其次保留變體，至少湊滿題數
        kept.push(d.question_id);
      }
    }

    return kept;
  }

  /**
   * 取得 question_id → stem_key 對照表（全表）。同一題的所有變體共享一個 stem。
   * 5 分鐘 TTL，與其他快取一致；題庫變動後重啟 backend 即可立即更新。
   */
  private stemMapCache: Map<number, string> | null = null;
  private stemMapCacheAt = 0;
  private getStemMap(): Map<number, string> {
    const now = Date.now();
    if (this.stemMapCache && now - this.stemMapCacheAt < CACHE_TTL_MS) {
      return this.stemMapCache;
    }
    const rows = this.db
      .prepare('SELECT question_id, content, options, correct_answer, question_type FROM questions')
      .all() as Array<{
        question_id: number; content: string; options: string;
        correct_answer: string; question_type: string;
      }>;
    const map = new Map<number, string>();
    for (const r of rows) map.set(r.question_id, computeStemKey(r));
    this.stemMapCache = map;
    this.stemMapCacheAt = now;
    return map;
  }

  /**
   * 取得使用者「每一個題幹 (stem)」歷來最後一次被出的時間（epoch 秒）。
   * 把所有變體合併計算 — 出過 #315 等同出過整組 16 個 #315~#330 變體。
   * 未曾被出過 → 不會出現在 Map 中（視為 0，最優先）。
   */
  private getLastServedMap(userId: number): Map<string, number> {
    const stemMap = this.getStemMap();
    const rows = this.db
      .prepare(
        `SELECT d.question_id, MAX(strftime('%s', s.start_time)) AS last_ts
         FROM quiz_details d
         JOIN quiz_sessions s ON s.session_id = d.session_id
         WHERE s.user_id = ?
         GROUP BY d.question_id`
      )
      .all(userId) as Array<{ question_id: number; last_ts: string | null }>;
    const map = new Map<string, number>();
    for (const r of rows) {
      const stem = stemMap.get(r.question_id);
      if (!stem) continue;
      const ts = Number(r.last_ts) || 0;
      const prev = map.get(stem) ?? 0;
      if (ts > prev) map.set(stem, ts);
    }
    return map;
  }

  /**
   * 把每個 category bucket 依「題幹最久沒出 / 從未出過」排序。
   * 步驟：先 shuffle 製造隨機平手序，再用 stable sort 依 stemLastServed ASC 排序。
   * 結果：從未出過題幹的題目排在前面（彼此隨機），其後是越早出過的題幹越前。
   * pickDiverseQuestions 取 cursor 0 時就會優先吃到從未出過的題幹。
   */
  private rankBuckets(
    buckets: Record<string, number[]>,
    stemLastServed: Map<string, number>,
  ): Record<string, number[]> {
    const stemMap = this.getStemMap();
    const out: Record<string, number[]> = {};
    for (const [cat, ids] of Object.entries(buckets)) {
      const randomized = shuffle([...ids]);
      randomized.sort((a, b) => {
        const sa = stemMap.get(a) ?? String(a);
        const sb = stemMap.get(b) ?? String(b);
        return (stemLastServed.get(sa) ?? 0) - (stemLastServed.get(sb) ?? 0);
      });
      out[cat] = randomized;
    }
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

    // 讀使用者偏好：is_sen_mode 決定題數；question_level 決定抽題行為
    //   question_level=0 「重複練習」：不做 stem 級 LRU、不做 stem dedupe；
    //                    同題幹的多個變體會反覆出現 → 適合 SEN / 低年級重複熟練
    //   question_level=1 「多樣化」：stem-aware LRU + stem dedupe + bucket shuffle；
    //                    跨場最大化題庫覆蓋 → 適合一般 / 中高年級
    const user = db
      .prepare('SELECT is_sen_mode, question_level FROM users WHERE user_id = ?')
      .get(userId) as { is_sen_mode: number; question_level: number } | undefined;
    const questionCount = user?.is_sen_mode ? 5 : 10;
    const isLv1 = user?.question_level === 1;

    // Lv1 才需要計算「題幹級最近出題時間」做 LRU 排序
    const stemLastServed = isLv1 ? this.getLastServedMap(userId) : new Map<string, number>();

    let selectedIds: number[];

    if (theoryType === 'sorting') {
      // 排句子專區：只從 question_type='sorting' 的題目中抽取，跨全部 category。
      const rows = this.db
        .prepare(
          `SELECT question_id, category_type FROM questions
           WHERE subject = ? AND question_type = 'sorting'`
        )
        .all(subject) as Array<{ question_id: number; category_type: string }>;

      const buckets: Record<string, number[]> = {};
      for (const r of rows) (buckets[r.category_type] ??= []).push(r.question_id);

      const totalAvail = rows.length;
      if (totalAvail < questionCount) {
        throw new Error(`排句子題庫不足：只有 ${totalAvail} 題，需要 ${questionCount} 題`);
      }

      const useBuckets = isLv1 ? this.rankBuckets(buckets, stemLastServed) : buckets;
      selectedIds = this.pickDiverseQuestions(useBuckets, questionCount);
    } else if (theoryType === 'mixed') {
      // 綜合練習：四個理論各取 2-3 題（SEN 各取 1-2），確保題目最多元。
      const theories = ['cognitive', 'input', 'usage', 'sociocultural'];
      const perTheory = Math.ceil(questionCount / theories.length); // 3 normal, 2 SEN
      const allIds: number[] = [];

      for (const theory of theories) {
        const tb = this.getBucketsByCategory(subject, theory);
        const useTb = isLv1 ? this.rankBuckets(tb, stemLastServed) : tb;
        allIds.push(...this.pickDiverseQuestions(useTb, perTheory));
      }

      // Shuffle combined set, trim to exact count, ensure no dupes from rounding
      selectedIds = shuffle([...new Set(allIds)]).slice(0, questionCount);

      // If short (edge case: very thin DB), fill from remaining theories ignoring ranking
      if (selectedIds.length < questionCount) {
        for (const theory of theories) {
          if (selectedIds.length >= questionCount) break;
          const fb = this.getBucketsByCategory(subject, theory);
          const extra = this.pickDiverseQuestions(fb, questionCount - selectedIds.length);
          selectedIds = [...new Set([...selectedIds, ...extra])].slice(0, questionCount);
        }
      }
    } else {
      const buckets = this.getBucketsByCategory(subject, theoryType);
      const totalAvail = Object.values(buckets).reduce((s, ids) => s + ids.length, 0);
      if (totalAvail < questionCount) {
        throw new Error(`題庫不足：${subject}/${theoryType} 只有 ${totalAvail} 題，需要 ${questionCount} 題`);
      }
      const useBuckets = isLv1 ? this.rankBuckets(buckets, stemLastServed) : buckets;
      selectedIds = this.pickDiverseQuestions(useBuckets, questionCount);
    }

    // Lv1 才做 stem-level dedupe（同題幹只留一個）。Lv0 故意保留變體 → 重複練習。
    if (isLv1) {
      selectedIds = this.deduplicateByContent(selectedIds);
    }
    const placeholders = selectedIds.map(() => '?').join(',');
    const questions = db
      .prepare(
        `SELECT question_id, theory_type, category_type, question_type,
                content, options, options_zhuyin, correct_answer, explanation, score, subject
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

    // 顯示過的題目馬上寫入 quiz_details（空答案）。
    // 即使使用者中途放棄，getRecentlySeenIds 也能排除這些題目，
    // 確保 6 小時內「看過的」和「答過的」都不重複出現。
    const preInsert = db.prepare(
      `INSERT OR IGNORE INTO quiz_details (session_id, question_id, user_answer, is_correct)
       VALUES (?, ?, '', 0)`
    );
    db.transaction((ids: number[]) => { for (const id of ids) preInsert.run(sessionId, id); })(selectedIds);

    // 移除 correct_answer，絕不回傳給前端
    const questionsForClient: QuestionForClient[] = questions.map((q) => ({
      question_id: q.question_id,
      theory_type: q.theory_type,
      category_type: q.category_type,
      question_type: q.question_type,
      content: JSON.parse(q.content),
      options: JSON.parse(q.options) as Record<string, string>,
      options_zhuyin: q.options_zhuyin
        ? (JSON.parse(q.options_zhuyin) as Record<string, Array<{ char: string; pinyin: string }>>)
        : undefined,
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
      .prepare('SELECT correct_answer, correct_answer_alt, explanation FROM questions WHERE question_id = ?')
      .get(questionId) as { correct_answer: string; correct_answer_alt: string | null; explanation: string } | undefined;
    if (!question) {
      throw new Error('找不到題目');
    }

    const trimmedUser = userAnswer.trim();
    const validAnswers = [question.correct_answer.trim()];
    if (question.correct_answer_alt) {
      // alt 以 | 分隔多個有效答案順序（例如「我陪同學」與「同學陪我」皆可接受）
      for (const a of question.correct_answer_alt.split('|')) {
        const t = a.trim();
        if (t) validAnswers.push(t);
      }
    }
    const isCorrect = validAnswers.includes(trimmedUser) ? 1 : 0;

    // UPDATE the pre-inserted placeholder row (written by startQuiz).
    // Use UPDATE rather than INSERT OR REPLACE to preserve the detail_id primary key.
    db.prepare(
      `UPDATE quiz_details
       SET user_answer = ?, is_correct = ?, speech_text = ?, speech_score = ?
       WHERE session_id = ? AND question_id = ?`
    ).run(userAnswer, isCorrect, speechText ?? null, speechScore ?? null, sessionId, questionId);

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
                q.content, q.options, q.options_zhuyin, q.correct_answer, q.explanation, q.question_type
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
    // 得幾分就加幾 EXP（1:1），通過加 10 分獎勵
    const expGained = score + (passed ? 10 : 0);

    const user = db
      .prepare('SELECT total_exp, current_level FROM users WHERE user_id = ?')
      .get(userId) as { total_exp: number; current_level: number };

    const newTotalExp = user.total_exp + expGained;
    // 等級公式：每升一級所需分數 = 5000 × 2^(level-1)
    // Lv1→2: 5000, Lv2→3: 10000, Lv3→4: 20000 ...
    let newLevel = 1;
    let cumulative = 0;
    while (cumulative + 5000 * Math.pow(2, newLevel - 1) <= newTotalExp) {
      cumulative += 5000 * Math.pow(2, newLevel - 1);
      newLevel++;
    }
    const levelUp = newLevel > user.current_level;

    // 經驗值（total_exp）同時也以相同金額增加兌換獎品分數（reward_points）
    // 兩個系統獨立：total_exp 只增（升等用），reward_points 可花費（兌換用）
    db.prepare(
      `UPDATE users SET total_exp = ?, current_level = ?,
              reward_points = reward_points + ? WHERE user_id = ?`
    ).run(newTotalExp, newLevel, expGained, userId);

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
