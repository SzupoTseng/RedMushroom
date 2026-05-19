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

export default router;
