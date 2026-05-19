# RedMushroom（紅蘑菇）🍄

> Digital Chinese Learning System for Elementary School (Grades 3–4)
> 國小 3-4 年級國語文數位學習系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Language / 語言：** [English](#english) | [繁體中文](#繁體中文)

---

## English

### Features

- 🧠 **4 Learning Theories**: Cognitive, Input, Usage, Sociocultural
- 🎮 **RPG Progress System**: EXP, levels, win streaks, Grammar Sprite pet
- 📊 **6-Dimension Analytics**: Accuracy, Stability, Breadth, Cognitive, Endurance, Fluency
- 🌟 **SEN-Friendly Mode**: Easy Learning Mode (5 questions, large font, relaxed scoring)
- 📱 **QR Code Parent Portal**: Parents scan to view learning progress
- 👩‍🏫 **Teacher Dashboard**: Class overview, PDF reports, CSV export
- 🏆 **Non-Repeating Praise System**: Context-aware praise selection
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
| Database | SQLite (better-sqlite3, synchronous) |
| Auth | JWT + bcrypt |
| Charts | Recharts (Radar + Bar) |
| Drag & Drop | @hello-pangea/dnd |
| Testing | Playwright E2E |

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

- All SQL queries include `WHERE user_id = ?` to prevent IDOR
- `/api/quiz/start` never returns `correct_answer`
- JWT + bcrypt (rounds=12) authentication
- SEN labels never expose clinical terminology in the UI

### License

MIT License — Free for use and adaptation in schools worldwide.

---

## 繁體中文

### 特色功能

- 🧠 **四大學習主題**：語詞認知、語言輸入、語言運用、社文語境
- 🎮 **RPG 成長系統**：經驗值、等級、連勝天數、文法小精靈寵物
- 📊 **六維度分析**：準確率、穩定性、廣泛性、認知、耐力、流暢
- 🌟 **SEN 友善模式**：輕鬆學習模式（5 題、大字體、寬鬆計分）
- 📱 **QR Code 行動管理**：家長可掃碼查看學習進度
- 👩‍🏫 **老師管理台**：班級儀表板、PDF 報告、CSV 匯出
- 🏆 **防重複讚美系統**：AI 選取適合情境的讚美語
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
| 資料庫 | SQLite (better-sqlite3，同步) |
| 驗證 | JWT + bcrypt |
| 圖表 | Recharts (Radar + Bar) |
| 拖拉 | @hello-pangea/dnd |
| 測試 | Playwright E2E |

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

- 所有 SQL 查詢帶 `WHERE user_id = ?` 防止 IDOR
- `/api/quiz/start` 不回傳 `correct_answer`
- JWT + bcrypt (rounds=12) 認證
- SEN 標籤不顯示「遲緩」等字眼

### 授權

MIT License — 歡迎在台灣中小學免費使用及二次開發
