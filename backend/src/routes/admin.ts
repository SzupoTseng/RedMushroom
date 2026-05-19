import { Router } from 'express';
import { authMiddleware, requireRole } from '../middlewares/authMiddleware';
import {
  getClassStats,
  getStudentReport,
  getStudentPdf,
  exportClassCsv,
  getDashboard,
  generateQrCode,
} from '../controllers/adminController';

const router = Router();

// 所有 admin 路由需驗證 + teacher 角色
router.use(authMiddleware);
router.use(requireRole('teacher'));

router.get('/dashboard', getDashboard);
router.get('/class/stats', getClassStats);
router.get('/student/:userId/report', getStudentReport);
router.get('/student/:userId/pdf', getStudentPdf);
router.get('/class/export/csv', exportClassCsv);
router.post('/student/:userId/qr', generateQrCode);

export default router;
