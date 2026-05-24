import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

import authRouter from './routes/auth';
import quizRouter from './routes/quiz';
import adminRouter from './routes/admin';
import dictRouter from './routes/dict';
import { errorHandler } from './middlewares/errorHandler';
import { getDb } from './db/database';

const app = express();

// 初始化資料庫連線（在啟動時執行一次）
getDb();

app.use(cors({
  // 生產環境下，因為前後端同源（Express 自己 serve frontend），不需要 CORS。
  // 但保留設定以利反向代理 / 自訂網域使用。
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN ?? false)
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// API 路由
app.use('/api/auth', authRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dict', dictRouter);

// 健康檢查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生產環境：把編譯好的前端 dist 當靜態檔伺服 + SPA fallback
if (process.env.NODE_ENV === 'production') {
  const distDir = path.resolve(__dirname, '../../frontend/dist');
  app.use(express.static(distDir, {
    maxAge: '7d',                 // hashed assets 可長期快取
    setHeaders: (res, filePath) => {
      // index.html 不快取，確保部署後使用者拿到最新版
      if (filePath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));
  // SPA fallback：所有非 /api 的請求都回 index.html
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

// 404 — 只會接到 /api/* 找不到的路由（SPA fallback 已接走其他）
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 全局錯誤處理
app.use(errorHandler);

export default app;
