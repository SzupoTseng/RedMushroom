# RedMushroom Agent Instructions

**RedMushroom（紅蘑菇）** — 國小 3-4 年級國語文數位學習系統

## 架構總覽

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS (`frontend/`)
- **Backend**: Node.js + Express + TypeScript (`backend/`)
- **Database**: SQLite via better-sqlite3 (`database/redmushroom.db`)
- **詳細規範**: 見 `CLAUDE.md`

## 核心指令

```bash
npm run setup    # 首次：安裝 + 建 DB + Seed
npm start        # 同時啟動前後端 (frontend: 5173, backend: 3001)
npm run test:e2e # Playwright E2E 測試
```

## AI 助理規範

1. **閱讀 CLAUDE.md 優先** — 所有開發規範在該文件
2. **SQLite 同步 API** — 禁止 async/await 於 DB 操作
3. **安全第一** — SQL 必帶 `WHERE user_id = ?`，API 不回傳 `correct_answer`
4. **禁止 ORDER BY RAND()** — 使用記憶體 Fisher-Yates shuffle
5. **SEN 模式包裝** — 前端只說「輕鬆學習模式」，不用「遲緩」等詞
