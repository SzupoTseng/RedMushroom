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
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// 路由
app.use('/api/auth', authRouter);
app.use('/api/quiz', quizRouter);
app.use('/api/admin', adminRouter);
app.use('/api/dict', dictRouter);

// 健康檢查
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// 全局錯誤處理
app.use(errorHandler);

export default app;
