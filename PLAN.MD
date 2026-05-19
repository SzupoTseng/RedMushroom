# RedMushroom（紅蘑菇）— 小學中文教學數位課程系統 完整建構藍圖

## 專案概述

**專案名稱：RedMushroom（紅蘑菇）**  
服務國小 3-4 年級學生的中文數位課程系統。4 大教育理論流派 × 8 大生活應用類別 = 32 維度題庫矩陣，共 2,000 題。每次測驗從指定理論題庫隨機抽 10 題，每題 10 分，60 分及格方可累計。

## 技術棧

| 層 | 技術 |
|----|------|
| 前端 | React 18 + TypeScript + Vite + Tailwind CSS |
| 狀態管理 | React Context + useReducer |
| 後端 | Node.js + Express + TypeScript |
| 資料庫 | **SQLite**（`better-sqlite3`，零安裝）|
| 圖表 | Recharts |
| 拖曳排序 | @hello-pangea/dnd |
| 測試 | Playwright |
| 部署 | Docker（選用），Single Container |

## 安裝方式

```
步驟 1：安裝 Node.js（https://nodejs.org，下一步到底）
步驟 2：下載本專案 ZIP → 解壓縮
步驟 3：雙擊 start.bat（Windows）或 start.command（Mac）
         → 自動裝依賴 + 建立資料庫 + 開啟瀏覽器
```

或使用指令：
```bash
npm run setup   # 首次安裝
npm start       # 啟動
```

---

## Stage 清單（共 19 個 Stage）

| Stage | 功能 | 狀態 |
|-------|------|------|
| **S0** | 雙擊啟動腳本（start.bat / start.command）| ✅ |
| **S0B** | 多科目模組化架構（modules/ + SubjectSelector.tsx）| ✅ |
| **S1** | SQLite DB Schema（11 張資料表）| ✅ |
| **S2** | CLI 題庫生成器（AI 自動生成 2000 題）| ✅ |
| **S3** | 後端 API（JWT + IDOR 防護 + Fisher-Yates 抽題）| ✅ |
| **S4** | 前端答題介面（QuizContext 狀態機）| ✅ |
| **S5** | 教育報表（雷達圖 + 弱點診斷）| ✅ |
| **S6** | E2E 測試（Playwright + AI 兒童測試員）| ✅ |
| **S7** | RPG 升級系統 + 500 句讚美庫 | ✅ |
| **S8** | 架構修正（3 個技術債）| ✅ |
| **S9** | Docker 部署（Single Container）| ✅ |
| **S10** | 注音 ruby 全域開關 | ✅ |
| **S11A** | 語音口說診斷（Web Speech API）| ✅ |
| **S11B** | 錯題怪獸（間隔重複系統）| ✅ |
| **S11C** | 台灣在地化題庫（夜市/捷運/珍奶）| ✅ |
| **S11D** | PDF 學習單匯出（pdfkit）| ✅ |
| **S12A** | 每日連勝火焰 + 寶箱 | ✅ |
| **S12B** | 班級非同步 PvP 競技場 | ✅ |
| **S12C** | 虛擬文法小精靈養成 | ✅ |
| **S12D** | 班級進步神速英雄榜 | ✅ |
| **S13A** | SEN 特教模式後端開關 | ✅ |
| **S13B** | 特教讚美庫（50 句）| ✅ |
| **S13C** | 無障礙 QuizBoard（大字/單欄/防誤觸）| ✅ |
| **S14A** | 國際化 README（英繁雙語）| ✅ |
| **S14B** | CONTRIBUTING.md + Issue 模板 | ✅ |
| **S14C** | HN / PH / Reddit 行銷文案 | ✅ |
| **S14D** | Open-Core 永續商業化規劃 | ✅ |
| **S15A** | Single Container Dockerfile | ✅ |
| **S15B** | i18n 多語言架構（zh-TW/en/ja/ko）| ✅ |
| **S15C** | 記憶體抽題快取（O(1) Fisher-Yates）| ✅ |
| **S16A** | BiBo 吉祥物元件（React.memo + SEN降級）| ✅ |
| **S17A** | QR Code 後端授權 API | ✅ |
| **S17B** | 手機 RWD 管理後台 | ✅ |

---

## 資料庫表清單（最終 11 張）

| 表名 | 說明 |
|------|------|
| `users` | 使用者（含 EXP/等級/連勝/class_id/is_sen_mode）|
| `questions` | 題庫（含 ZhuyinChar JSON + prompt_i18n + subject）|
| `quiz_sessions` | 測驗回合（含 duration_seconds, pvp_mode）|
| `quiz_details` | 每題作答紀錄（含 speech_score）|
| `praise_library` | 讚美語庫（含 sen_encouragement）|
| `user_praise_history` | 避免重複讚美 |
| `user_stats` | 五維度指標快取 |
| `user_error_monsters` | 錯題怪獸（間隔重複）|
| `user_items` | 虛擬倉庫（寶箱獎勵）|
| `user_sprites` | 文法小精靈寵物 |
| `mobile_linking_tokens` | QR Code 一次性授權 |

---

## 多科目模組擴充方法

```
modules/
  chinese/    ← 已實作（本專案主體）
  math/       ← 預留（複製 chinese/ 後改 module.config.json）
  nature/     ← 預留
  social/     ← 預留
  english/    ← 預留
```

新增科目只需三步：
1. 複製 `modules/chinese/` → `modules/math/`
2. 修改 `module.config.json`（名稱/顏色/理論分類）
3. 提供題庫 JSON → `npm run seed:math`

詳見 `modules/MODULE_SPEC.md`。

---

## 安全設計原則

- 所有 `/api/quiz/*` 與 `/api/admin/*` 路由強制 `authMiddleware`
- `req.user.user_id` 為唯一信任來源，防 IDOR
- 密碼 `bcrypt` hash，禁止明文
- `/api/quiz/start` 回傳題目**絕對不含** `correct_answer`
- QR Code token：UUID v4 + 一次性 + 5 分鐘過期
- SEN 特教標籤前端不顯示，後台以「輕鬆學習模式」包裝

---

*最後更新：2026-05-19*
