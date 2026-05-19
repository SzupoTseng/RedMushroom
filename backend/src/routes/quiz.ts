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

export default router;
