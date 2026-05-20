# RedMushroom（紅蘑菇）🍄

> Digital Chinese Learning System for Elementary School (Grades 3–4)
> 國小 3-4 年級國語文數位學習系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Language / 語言：** [English](#english) | [繁體中文](#繁體中文)

---

## English

### Features

- 🧠 **4 Learning Theories**: Cognitive, Input, Usage, Sociocultural
- 📚 **~1,500 Questions**: 32-template matrix + 57 Taiwan-localised seeds (夜市/捷運/珍奶/節慶)
- 🎮 **RPG Progress System**: EXP, levels, win streaks, Grammar Sprite pet
- 🔥 **Daily Streak Rewards**: Treasure chest unlocks at 7 / 14 / 30 days
- 🐲 **Error Monsters**: SM-2-lite spaced repetition (6h/24h/72h/168h/336h; 3-in-a-row purifies)
- ⚔️ **Async PvP Arena**: Challenge the median of your own past 5 sessions
- 🏆 **Class Hero Leaderboard**: Privacy-masked names for classmates
- 🎤 **Speech Bonus XP**: Web Speech API (zh-TW); +5 XP for ≥70% similarity
- 📊 **6-Dimension Analytics**: Accuracy, Stability, Breadth, Cognitive, Endurance, Fluency
- 🌟 **SEN-Friendly Mode**: Easy Learning Mode (5 questions, large font, 1.8s anti-mistap)
- 💬 **555-line Praise Library**: 503 general + 52 SEN-specialty, non-repeating (last 20 excluded)
- 📱 **QR Code Parent Portal**: 5-minute one-time token, no cloud account needed
- 👩‍🏫 **Teacher Dashboard**: Class overview, PDF reports, CSV export
- 🌐 **Multi-language UI**: zh-TW / English / Japanese / Korean

### Quick Start (zero config, double-click to launch)

**Windows**
```
Double-click start.bat
```

**macOS**
```
Double-click start.command
(First time: run  chmod +x start.command  in Terminal)
```

**Developer commands**
```bash
npm run setup    # First run: install deps + create DB + seed demo data
npm start        # Start frontend + backend concurrently
```

### Demo Accounts

| Username | Password | Role |
|----------|----------|------|
| teacher | teacher123 | Teacher |
| student1 | student123 | Student |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Vite + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | SQLite (better-sqlite3 v11, synchronous) |
| Auth | JWT + bcrypt (rounds=12) |
| Charts | Recharts (Radar + Bar) |
| Drag & Drop | @hello-pangea/dnd |
| Speech | Web Speech API (zh-TW; Chrome/Edge) |
| PDF | pdfkit |
| QR Code | qrcode |
| Unit Tests | vitest (backend services) |
| E2E Tests | Playwright + AI child tester (4 personas) |

### Project Structure

```
RedMushroom/
├── frontend/          # React frontend
├── backend/           # Express backend
├── database/          # SQLite schema
├── scripts/           # Setup & seed scripts
├── modules/           # Multi-subject module definitions
├── tests/             # E2E tests
├── docs/              # Documentation
├── start.bat          # Windows one-click launcher
├── start.command      # macOS one-click launcher
└── CLAUDE.md          # Developer guidelines
```

### Security

- All SQL queries touching student data include `WHERE user_id = ?` to prevent IDOR
- `/api/quiz/start` never returns `correct_answer` (verified by Playwright)
- JWT + bcrypt (rounds=12) authentication; tokens expire in 7 days
- SEN labels never expose clinical terminology in the UI ("輕鬆學習模式" only)
- QR-link tokens are UUID v4, one-time use, 5-minute expiry
- 17 vitest unit tests cover the SEN praise router, error-monster SM-2 scheduler, streak reward idempotence, and PvP weighting

### Developer commands

```bash
cd backend && npm test           # vitest unit tests
npm run test:e2e                  # Playwright end-to-end
npm run test:child                # AI child tester (1 quiz, 4 personas rotating)
npm run test:child:batch          # 50 quizzes with random personas
```

### License

MIT License — Free for use and adaptation in schools worldwide.

---

## 繁體中文

### 特色功能

- 🧠 **四大學習主題**：語詞認知、語言輸入、語言運用、社文語境
- 📚 **約 1,500 道題目**：32 模板矩陣 + 57 道臺灣在地化（夜市/捷運/珍奶/節慶）
- 🎮 **RPG 成長系統**：經驗值、等級、連勝天數、文法小精靈寵物
- 🔥 **每日連勝寶箱**：7 / 14 / 30 天里程碑自動解鎖獎勵
- 🐲 **錯題怪獸**：SM-2-lite 間隔重複（6h/24h/72h/168h/336h；連對 3 次淨化）
- ⚔️ **班級競技場**：挑戰過去 5 場自己的中位數
- 🏆 **班級英雄榜**：同學名字隱碼（首字＋同學）
- 🎤 **語音加分**：Web Speech API（zh-TW），相似度 ≥70% 答對 +5 XP
- 📊 **六維度分析**：準確率、穩定性、廣泛性、認知、耐力、流暢
- 🌟 **SEN 友善模式**：輕鬆學習模式（5 題、大字單欄、1.8 秒防誤觸）
- 💬 **555 條讚美庫**：503 一般 + 52 SEN 專屬，最近 20 條不重複
- 📱 **QR Code 行動管理**：5 分鐘一次性 token，零雲端帳號
- 👩‍🏫 **老師管理台**：班級儀表板、PDF 報告、CSV 匯出
- 🌐 **多語言介面**：繁中 / 英文 / 日文 / 韓文

### 快速開始（零設定，雙擊即用）

**Windows**
```
雙擊 start.bat
```

**Mac**
```
雙擊 start.command
（首次需在終端機執行：chmod +x start.command）
```

**開發者指令**
```bash
npm run setup    # 首次安裝 + 建立資料庫 + 植入示範資料
npm start        # 同時啟動前後端
```

### 示範帳號

| 帳號 | 密碼 | 角色 |
|------|------|------|
| teacher | teacher123 | 老師 |
| student1 | student123 | 學生 |

### 技術架構

| 層次 | 技術 |
|------|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 後端 | Node.js + Express + TypeScript |
| 資料庫 | SQLite (better-sqlite3 v11，同步) |
| 驗證 | JWT + bcrypt (rounds=12) |
| 圖表 | Recharts (Radar + Bar) |
| 拖拉 | @hello-pangea/dnd |
| 語音 | Web Speech API（zh-TW；Chrome/Edge） |
| PDF | pdfkit |
| QR Code | qrcode |
| 單元測試 | vitest（後端 services） |
| E2E 測試 | Playwright + AI 兒童測試員（4 種 persona） |

### 目錄結構

```
RedMushroom/
├── frontend/          # React 前端
├── backend/           # Express 後端
├── database/          # SQLite Schema
├── scripts/           # 安裝與種子腳本
├── modules/           # 多科目模組定義
├── tests/             # E2E 測試
├── docs/              # 說明文件
├── start.bat          # Windows 一鍵啟動
├── start.command      # Mac 一鍵啟動
└── CLAUDE.md          # 開發規範
```

### 安全設計

- 所有涉及學生資料的 SQL 帶 `WHERE user_id = ?` 防止 IDOR
- `/api/quiz/start` 絕不回傳 `correct_answer`（由 Playwright 測試守門）
- JWT + bcrypt (rounds=12) 認證；Token 7 天到期
- SEN 標籤前端僅顯示「輕鬆學習模式」，不使用「遲緩 / 特教」等字眼
- QR Code Token：UUID v4，一次性，5 分鐘到期
- 17 個 vitest 單元測試守住 SEN 讚美路由、錯題怪獸排程、寶箱解鎖冪等、PvP 加權比對

### 開發者指令

```bash
cd backend && npm test            # vitest 後端單元測試
npm run test:e2e                  # Playwright E2E
npm run test:child                # AI 兒童測試員（1 場，4 種 persona 輪流）
npm run test:child:batch          # 50 場，隨機 persona
```

### 授權

MIT License — 歡迎在台灣中小學免費使用及二次開發
