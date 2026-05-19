import app from './app';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

app.listen(PORT, () => {
  console.log(`[RedMushroom] 後端啟動於 http://localhost:${PORT}`);
  console.log(`[RedMushroom] 環境：${process.env.NODE_ENV ?? 'development'}`);
});
