import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // 不洩漏 stack trace
  const isDev = process.env.NODE_ENV === 'development';
  console.error('[ErrorHandler]', err.message, isDev ? err.stack : '');

  res.status(500).json({
    error: '伺服器發生錯誤，請稍後再試',
    ...(isDev ? { detail: err.message } : {}),
  });
}
