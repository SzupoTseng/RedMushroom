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

export default router;
