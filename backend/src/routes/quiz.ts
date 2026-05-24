import { Router } from 'express';
import {
  startQuiz,
  submitAnswer,
  finishQuiz,
  getSessionResult,
  getSubjects,
  getMyReport,
} from '../controllers/quizController';
import { listDue, reviewMonster } from '../controllers/errorMonsterController';
import { getLeaderboard } from '../controllers/leaderboardController';
import { classmates as pvpClassmates, createChallenge as pvpCreateChallenge } from '../controllers/pvpController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// 所有測驗路由需要驗證
router.use(authMiddleware);

router.get('/subjects', getSubjects);
router.get('/me/report', getMyReport);
router.post('/start', startQuiz);
router.post('/answer', submitAnswer);
router.post('/finish', finishQuiz);
router.get('/session/:sessionId', getSessionResult);

// 錯題怪獸（S11B）
router.get('/monsters', listDue);
router.post('/monsters/review', reviewMonster);

// 班級英雄榜（S12D）
router.get('/leaderboard', getLeaderboard);

// PvP 競技場（S12B）
router.get('/pvp/classmates', pvpClassmates);
router.post('/pvp/challenge', pvpCreateChallenge);

// 通用遊戲得分紀錄（打字遊戲、語詞快打、其他迷你遊戲過關後呼叫）
// Payload: { exp, reward, source }
//   - exp: 加到 total_exp（用於等級）
//   - reward: 加到 reward_points（可兌換）
//   - source: 紀錄來源字串（如 "typing-game", "word-typing-lv5"）
router.post('/game-score', (req, res) => {
  try {
    const userId = (req as import('express').Request).user!.user_id;
    const { exp = 0, reward = 0, source = 'game' } = req.body as {
      exp?: number; reward?: number; source?: string;
    };
    if (
      typeof exp !== 'number' || typeof reward !== 'number' ||
      exp < 0 || reward < 0 || exp > 9999 || reward > 9999
    ) {
      res.status(400).json({ error: '分數超出合理範圍' });
      return;
    }
    if (exp === 0 && reward === 0) {
      // Nothing to update — return current state so client can refresh if needed
      const db = require('../db/database').getDb();
      const row = db.prepare(
        'SELECT total_exp, reward_points, current_level FROM users WHERE user_id = ?'
      ).get(userId);
      res.json({ ok: true, ...row, source });
      return;
    }

    const db = require('../db/database').getDb();
    const user = db.prepare(
      'SELECT total_exp, reward_points FROM users WHERE user_id = ?'
    ).get(userId) as { total_exp: number; reward_points: number };
    const newExp = user.total_exp + exp;
    const newRewardPoints = user.reward_points + reward;

    // Same level formula as quizService.updateExp
    let newLevel = 1;
    let cumulative = 0;
    while (cumulative + 5000 * Math.pow(2, newLevel - 1) <= newExp) {
      cumulative += 5000 * Math.pow(2, newLevel - 1);
      newLevel++;
    }

    db.prepare(
      `UPDATE users SET total_exp = ?, current_level = ?, reward_points = ?
       WHERE user_id = ?`
    ).run(newExp, newLevel, newRewardPoints, userId);

    res.json({
      ok: true,
      total_exp: newExp,
      reward_points: newRewardPoints,
      current_level: newLevel,
      source,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(500).json({ error: msg });
  }
});

// 打字遊戲語彙（從題庫抽取字＋注音）
router.get('/vocab', (req, res) => {
  try {
    const db = require('../db/database').getDb();
    // Pull distinct chars from question content (ZhuyinChar JSON arrays)
    const rows = db.prepare(
      `SELECT DISTINCT content FROM questions
       WHERE subject = 'chinese' AND question_type = 'single_choice'
       ORDER BY RANDOM() LIMIT 200`
    ).all() as Array<{ content: string }>;

    const seen = new Set<string>();
    const vocab: Array<{ char: string; py: string }> = [];

    for (const r of rows) {
      try {
        const chars = JSON.parse(r.content) as Array<{ char: string; pinyin: string }>;
        for (const c of chars) {
          if (
            c.char &&
            c.pinyin &&
            c.pinyin.length > 0 &&
            /^[一-鿿]$/.test(c.char) &&  // single CJK char
            !seen.has(c.char)
          ) {
            seen.add(c.char);
            vocab.push({ char: c.char, py: c.pinyin });
          }
        }
      } catch { /* skip malformed */ }
    }

    // Shuffle and return up to 120
    for (let i = vocab.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vocab[i], vocab[j]] = [vocab[j], vocab[i]];
    }
    res.json({ vocab: vocab.slice(0, 120) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(500).json({ error: msg });
  }
});

// 練習單列印（擴充模組）— 從題庫抽題給「列印練習單」用
// 不寫入 quiz_sessions / quiz_details，純粹只讀
router.get('/worksheet', (req, res) => {
  try {
    const subject = String(req.query.subject ?? 'chinese');
    const theory = String(req.query.theory ?? '').trim();
    const count = Math.max(5, Math.min(50, parseInt(String(req.query.count ?? '20')) || 20));
    const db = require('../db/database').getDb();

    const params: unknown[] = [subject];
    let where = 'subject = ? AND question_type = \'single_choice\'';
    if (theory) {
      where += ' AND theory_type = ?';
      params.push(theory);
    }

    interface Row {
      question_id: number;
      content: string;
      options: string;
      correct_answer: string;
      theory_type: string;
      category_type: string;
    }
    const rows = db.prepare(
      `SELECT question_id, content, options, correct_answer, theory_type, category_type
         FROM questions
        WHERE ${where}
        ORDER BY RANDOM()
        LIMIT ?`,
    ).all(...params, count) as Row[];

    const questions = rows.map((r) => {
      let contentText = '';
      try {
        const chars = JSON.parse(r.content) as Array<{ char: string }>;
        contentText = chars.map((c) => c.char).join('');
      } catch { contentText = r.content; }

      let options: Record<string, string> = {};
      try { options = JSON.parse(r.options); } catch { /* fallback */ }

      return {
        id: r.question_id,
        content: contentText,
        options,
        correctAnswer: r.correct_answer,
        theory: r.theory_type,
        category: r.category_type,
      };
    });

    res.json({ count: questions.length, questions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知錯誤';
    res.status(500).json({ error: msg });
  }
});

export default router;
