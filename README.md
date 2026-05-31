# RedMushroom（紅蘑菇）🍄

> 給臺灣國小 1-6 年級的中文 / 數學 / 自然 / 社會 / 經典 / 英文綜合學習平台
> Digital learning system for Taiwan elementary kids (Grades 1–6).

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Language / 語言：** [English](#english) | [繁體中文](#繁體中文)

---

## English

### Quick Start

```cmd
# First install (auto-downloads portable Node 22 LTS)
Double-click  start.bat

# Daily use
Double-click  start.bat   (or Run.bat to skip install check)
```

Browser opens `http://localhost:5173`. Student login: `student1 / student123`.

### What Students See (main page tiles, left to right)

**🎯 Quiz area** (with Lv0/Lv1 toggle)
- Mixed practice, sorting, cognitive, input, usage, sociocultural
- 10 questions per session (5 in SEN mode)

**💰 Classics / Poetry / Word games**

| Game | Items | Content |
|---|---:|---|
| 💰 **Idiom Fill (一字千金)** | 580 | Guess the missing character; bopomofo hint shown |
| 🔍 **Find the Wrong Char (一起找錯字)** | 531 | Spot the homophone error in an idiom; Tianzige layout |
| 📜 **Who Wrote This Poem (是誰寫的詩)** | 197 | Tang Poetry 300; pick author from 4 |
| 📚 **Three-Char Classic (三字經)** | 379 | Pick the next 3-char phrase; 59 with colloquial notes |
| 📖 **Standards for Students (弟子規)** | 359 | Pick the next phrase; 100 with notes + chapter |
| 🎓 **Analects (論語)** | 2059 | Pick the next sentence; 30 with vernacular translations |

**⚡ Speed games**: Bopomofo Typing (100 levels) · Word Typing (PvZ-style, 1000 words) · English Typing (2000-word JHS list, 60/120/180s timer)

**🛠️ Utilities**: Pronunciation tool · Stroke practice · Error Monsters (SM-2 spaced repetition) · Leaderboard · PvP arena

**📝 Printable modules**: Math practice generator · Tianzige worksheets · Bopomofo worksheets · Vertical bopomofo annotation

### Quiz Lv0 / Lv1 (Repetition vs. Diversity)

Segmented toggle on home page next to font selector. Default **Lv0** (repetition).

| | Lv0 (Repetition) | Lv1 (Diverse) |
|---|---|---|
| Same stem repeat | Variants may appear consecutively | Never in same session |
| Cross-session | 6h-window exclusion | Stem-aware LRU |
| Sorting bucket | SQL order | Shuffled |
| For | SEN / lower grades, drilling one concept | General / upper grades, broad coverage |

Setting is per-user (`users.question_level`), persisted via `PATCH /api/auth/me`.

**Sorting also accepts reversed orders**: e.g. "老師認真地教我" and "我認真地教老師" both grammatically valid — 216 reversible couplets auto-detected and stored in `correct_answer_alt`.

### Multi-PC Sync / Update

**A. Second PC has git**
```cmd
Double-click  update.bat
```
Runs `git pull`, reinstalls deps only if package.json changed. **Preserves**: DB (student data), node_modules, .tools/.

**B. Second PC has no git**
```cmd
Double-click  update-no-git.bat
```
PowerShell downloads ZIP from GitHub → robocopy merges (excludes DB / deps / .tools).
**Prereq**: main PC must `git push` first.

**C. Fully offline**
```cmd
robocopy "source" "D:\GameDevZ\RedMushroom" /MIR ^
  /XD node_modules .tools .git dist build ^
  /XF *.db *.db-wal *.db-shm .db-version *.log .env
```

After any update:
1. Double-click `start.bat` (backend auto-runs schema migration)
2. Hard-refresh browser: **Ctrl+Shift+R**

### .bat Toolkit

| .bat | Purpose |
|---|---|
| `start.bat` | Main entry: first-time install + daily startup, auto-downloads portable Node 22 |
| `Run.bat` | Skip install checks, just `npm start` |
| `reinstall.bat` | Fix broken node_modules / better-sqlite3 ABI mismatch |
| `reseed-db.bat` | Rebuild DB from scratch (**wipes student data**) |
| `add-extended.bat` | Add seed-extended.ts questions to existing DB (non-destructive) |
| `fix-sorting-alt.bat` | One-shot patch: add reversible alt answers to sorting questions |
| `update.bat` | git pull (machines with git) |
| `update-no-git.bat` | GitHub zip download (machines without git) |

All `.bat` files follow CLAUDE.md §9 rules: **CRLF line endings**, `chcp 65001 > nul` in top 3 lines (if non-ASCII), portable Node 22 PATH-prepend at start, no `setlocal enabledelayedexpansion` + same-block `!VAR!` read/write pitfalls.

### Scoring System (EXP + Reward Points)

Two independent "currencies":

| Field | Use | Behavior |
|---|---|---|
| `total_exp` | Level progression | Never decreases |
| `reward_points` | Spend on rewards | Spendable (shop not yet implemented) |

**All games credit EXP : reward = 1 : 1**. Level threshold: `5000 × 2^(lv-1)` (Lv1→2 5k, Lv2→3 10k, Lv3→4 20k…).

### Content Sources & Licensing

| Source | Used for | License / Treatment |
|---|---|---|
| Own templates (`scripts/questions/matrix.ts`) | Main quiz (~1080) | Own |
| `scripts/seed-extended.ts` hand-written | 401 supplementary across chinese/nature/social/math | Own |
| MOE Chinese Dictionary | Bopomofo lookup, char frequency, definitions | Government public domain |
| [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) | Tang poems, Three-Char Classic, Dizigui, Analects | MIT (curation) + ancient text public domain |
| Simplified-Chinese idiom set (wei_idiom) | Idiom Fill 4796 → filtered to 580 | opencc s2twp + MOE dict intersection |
| MOE dict + own rules | Find Wrong Char (12 curated + 519 generated) | MOE public + own algorithm |
| User-supplied JHS 2000 English wordlist | English Typing 1946 words | Facts extracted, PDF not redistributed |

**Design rule**: "License unclear → rewrite". Commercial textbooks: only extract question-type concepts, write our own. Government / MIT sources: cite directly.

### Tech Stack

```
Frontend  React 18 + Vite + Tailwind + React Router + Context+useReducer
          @hello-pangea/dnd (sorting), Web Speech API
Backend   Express + TypeScript, JWT auth, better-sqlite3 sync API
DB        SQLite (WAL mode) — database/redmushroom.db
```

**Runtime question picking** (`backend/src/services/quizService.ts`):
1. Read `users.question_level` → Lv0 / Lv1
2. **Lv1**: build `stemLastServed: Map<stem, last_ts>` → `rankBuckets` LRU-sorted → `pickDiverseQuestions` round-robins 8 categories → `deduplicateByContent` removes stem duplicates
3. **Lv0**: skip LRU + stem dedupe (repeat behavior preserved)

"Stem key" = question content + correct option text. Multiple variants of the same question share one stem.

### Demo Accounts

| Account | Password | Role |
|---|---|---|
| `student1` | `student123` | Student |
| `student2` | `student123` | Student |
| `teacher1` | `teacher123` | Teacher (admin) |
| `sen_student` | `student123` | SEN-mode student |

### Database Schema (key columns)

```sql
users
  user_id, username, password_hash, display_name, role, grade,
  total_exp, reward_points, current_level,
  streak_days, max_streak,
  is_sen_mode,        -- 1 = relaxed learning (5 Q, no timer)
  question_level      -- 0 = repetition / 1 = diverse (per-user)

questions
  question_id, subject, theory_type, category_type, question_type,
  content,            -- JSON: [{char, pinyin}, ...]
  options, options_zhuyin, correct_answer,
  correct_answer_alt, -- alt orders for reversible sorting (| separated)
  explanation, score
```

Migrations auto-apply via `ensureColumn()` in `backend/src/db/database.ts` — schema changes survive existing DBs.

### API Reference

```
POST   /api/auth/register
POST   /api/auth/login                 → { token, user }
GET    /api/auth/me                    → includes question_level / 5D stats
PATCH  /api/auth/me                    ← { display_name?, question_level? }
POST   /api/quiz/start                 ← { theory_type, subject }
POST   /api/quiz/answer
POST   /api/quiz/finish
POST   /api/quiz/game-score            ← { exp, reward, source }  ← all games share
GET    /api/dashboard/...              → 5D radar / stats
GET    /api/leaderboard
POST   /api/pvp/start                  → challenge past-self median
GET    /api/error-monsters/due
POST   /api/error-monsters/answered
```

All `/api/quiz/*` and `/api/admin/*` go through `authMiddleware`. `req.user.user_id` is the only trusted source → prevents IDOR.

### Security

- All SQL touching student data **must** include `WHERE user_id = ?`
- Passwords: `bcrypt` rounds=12, no plaintext
- `JWT_SECRET` generated by `scripts/gen-jwt-secret.mjs`, stored in `backend/.env` (gitignored)
- `/api/quiz/start` response **never** includes `correct_answer`
- Global error handler — no stack traces leak
- `.gitignore` blocks: `.env`, `*.db`, `*.pdf`, `.tools/`, `node_modules/`, `scripts/scrape/.venv/`, `scripts/scrape/data/`

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `NODE_MODULE_VERSION mismatch` | System Node 24+ but better-sqlite3 is Node 22 ABI | Double-click `start.bat` (auto-downloads portable Node 22) |
| Lv toggle missing on home | Old frontend bundle cached | Ctrl+Shift+R |
| Lv1 still shows repeats | Backend not restarted (migration didn't run) | Restart via `start.bat` |
| Sorting correct order marked wrong | Couplet not yet in `correct_answer_alt` | Run `fix-sorting-alt.bat` (covers 216 reversible couplets) |
| Cognitive still repeats | Pool too small | Run `add-extended.bat` for more questions |
| `'nstall' not recognized` | `.bat` LF endings misparsed by cmd | Use latest `.bat` files (CRLF + chcp 65001) |
| Login `Unexpected end of JSON input` | Backend on Node 24 but better-sqlite3 is Node 22 binary → crash | Launch via `start.bat` (portable Node 22 on PATH) |

---

## 繁體中文

1. [一分鐘入手](#一分鐘入手)
2. [學生看到的所有遊戲](#學生看到的所有遊戲)
3. [Quiz Lv0 / Lv1（重複練習 vs 多樣化）](#quiz-lv0--lv1重複練習-vs-多樣化)
4. [多 PC 同步 / 更新流程](#多-pc-同步--更新流程)
5. [.bat 工具一覽](#bat-工具一覽)
6. [計分系統 (EXP + 兌換獎品分數)](#計分系統-exp--兌換獎品分數)
7. [題庫來源與授權](#題庫來源與授權)
8. [技術架構](#技術架構)
9. [Demo 帳號](#demo-帳號)
10. [專案結構](#專案結構)
11. [資料庫 Schema](#資料庫-schema)
12. [API Reference](#api-reference)
13. [SEN 模式（輕鬆學習）](#sen-模式輕鬆學習)
14. [安全規範](#安全規範)
15. [Troubleshooting](#troubleshooting)
16. [License](#license)

---

## 一分鐘入手

```cmd
# 第一次安裝（含自動下載 portable Node 22 LTS）
雙擊  start.bat

# 之後每天用
雙擊  start.bat   ← 或者 Run.bat（跳過安裝檢查）
```

瀏覽器會自動開 `http://localhost:5173`。學生帳號 `student1 / student123`。

---

## 學生看到的所有遊戲

主頁面從左到右依序：

### 🎯 測驗區（可調 Lv0/Lv1）
- **綜合練習** — 四理論各取 2-3 題、八情境跨類別
- **排句子** — 拖曳詞語拼成正確句子（接受同義逆序）
- **語詞認知 / 語言輸入 / 語言運用 / 社文語境** — 單一理論深練
- 每場 10 題（SEN 模式 5 題）

### 💰 經典 / 詩 / 字遊戲

| 遊戲 | 題數 | 內容 |
|---|---:|---|
| 💰 **一字千金** | 580 | 成語猜缺字，附本字注音當提示 |
| 🔍 **一起找錯字** | 531 | 成語裡藏同音錯字，田字格排版 |
| 📜 **是誰寫的詩** | 197 | 唐詩三百首，猜作者 (19 位常見作者) |
| 📚 **三字經** | 379 | 看上句猜下句；59 對附口語白話 |
| 📖 **弟子規** | 359 | 看上句猜下句；100 對附口語白話 + 章節 |
| 🎓 **論語** | 2059 | 看上句猜下句；30 條經典名句附白話 |

### ⚡ 速打 / 互動遊戲
- 🎮 **注音打字** — 100 關落字，IME-相容
- 🍄 **語詞快打**（PvZ 風）— 蘑菇射種子打恐龍，1,000 個 2 字詞
- ⌨️ **英文快打** — 國中 2000 字，倒數計時

### 🛠️ 工具
- 📖 **讀音工具** — 貼文章自動標注音、查破音
- 🖋 **筆順練習** — 動畫 + 臨摹
- 🐲 **錯題怪獸** — SM-2 間隔重複
- 🏆 **班級英雄榜** — 名字隱私化
- ⚔️ **PvP 競技場** — 挑戰歷史中位數

### 📝 擴充模組（可列印）
- 數學練習產生器、田字格習字紙、注音符號習字紙、豎排注音摹寫等

---

## Quiz Lv0 / Lv1（重複練習 vs 多樣化）

主頁面注音字型旁有 segmented 切換 `[重複練習 | 多樣化]`，預設 **重複練習 (Lv0)**。

| | Lv0 「重複練習」 | Lv1 「多樣化」 |
|---|---|---|
| 同題重複 | 同題幹的多個變體可能連續出現 | 一場 quiz 絕不重複 |
| 跨場輪替 | 6 小時內排除已答過的 | stem-aware LRU，全題庫覆蓋後才回頭 |
| 排句子桶 | 維持 SQL 原序 | 桶內 shuffle |
| 適合對象 | 特教 / SEN / 低年級 | 一般 / 中高年級 |

設定 per-user 存在 `users.question_level`；PATCH `/api/auth/me` 即時切換。

**排句子接受逆序**：「老師認真地教我」也接受「我認真地教老師」（透過 `correct_answer_alt` 欄位，216 對句已自動標可逆）。

---

## 多 PC 同步 / 更新流程

### A. 第二台有 git
```cmd
雙擊  update.bat
```
自動 `git pull` → 偵測 package.json 改變才 reinstall → 完成。
**保留**：DB（學生分數）、node_modules、.tools/。

### B. 第二台沒 git
```cmd
雙擊  update-no-git.bat
```
PowerShell 從 GitHub 下載 zip → robocopy 合併（排除 DB / node_modules / .tools）。
**前置**：主機要先 `git push`。

### C. 完全離線
```cmd
robocopy "主機路徑" "D:\GameDevZ\RedMushroom" /MIR ^
  /XD node_modules .tools .git dist build ^
  /XF *.db *.db-wal *.db-shm .db-version *.log .env
```

不管哪種，更新後：
1. 雙擊 `start.bat`（後端啟動會自動跑 schema migration）
2. 瀏覽器 **Ctrl+Shift+R** 硬刷新

---

## .bat 工具一覽

| .bat | 用途 |
|---|---|
| `start.bat` | 主入口：首次/日常啟動，自動安裝 + 開瀏覽器 |
| `Run.bat` | 已 setup 後快速啟動 `npm start`，跳過安裝檢查 |
| `reinstall.bat` | node_modules 壞掉 / better-sqlite3 ABI 不符：砍 + 重灌 + 抓 portable Node 22 |
| `reseed-db.bat` | DB 結構大改要重建（**會清學生資料**）|
| `add-extended.bat` | 把 `scripts/seed-extended.ts` 的擴充題加進既有 DB（非破壞性）|
| `fix-sorting-alt.bat` | 一次性 patch：為排句子題加逆序 alt 答案 |
| `update.bat` | 有 git 的機器：`git pull` 更新原始碼 |
| `update-no-git.bat` | 沒 git 的機器：PowerShell 從 GitHub 下 zip 更新 |

所有 .bat 都遵守 CLAUDE.md §9 規範：
- **CRLF** 行尾（Windows cmd 才能正確解析多行 `setlocal` / `for /f`）
- 前 3 行有 `chcp 65001 > nul`（含非 ASCII 時必備）
- 含 portable Node 22 PATH-prepend：`if exist ".tools\node22\node.exe" set "PATH=%CD%\.tools\node22;%PATH%"`
- 不用 `setlocal enabledelayedexpansion` + 同段 `if` 內讀寫同變數（用 `:label` 子程序）

---

## 計分系統 (EXP + 兌換獎品分數)

兩條獨立「貨幣」：

| 欄位 | 用途 | 變化 |
|---|---|---|
| `total_exp` | 升等用 | 只增不減 |
| `reward_points` | 兌換獎品 | 可花費（目前尚無扣分機制）|

**所有遊戲統一 EXP : reward = 1 : 1**：
- 考試 / sorting：`score + 通過獎勵 10`
- 注音打字：1/字 (含獎勵 1/字)
- 語詞快打：bonus/關
- 英文快打 / 一字千金 / 一起找錯字 / 是誰寫的詩 / 三字經 / 弟子規 / 論語：答對數

升等門檻：`5000 × 2^(lv-1)` — Lv1→2 5000、Lv2→3 10000、Lv3→4 20000…

---

## 題庫來源與授權

所有題庫都是公共領域或經授權使用：

| 來源 | 用於 | 授權 / 處置 |
|---|---|---|
| 自家題目模板 (`scripts/questions/matrix.ts`) | 主測驗 ~1080 道 | 自有 |
| `scripts/seed-extended.ts` 手寫題 | 補強各 theory / subject (401 道) | 自有 |
| 教育部國語辭典 | 注音查表、字頻過濾、白話定義 | 政府公開資料 |
| [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) | 唐詩、三字經、弟子規、論語 | MIT 整理 + 古文公共領域 |
| 簡體成語題庫 wei_idiom | 一字千金 4796 → 過濾 580 | opencc 簡轉繁 + 教育部辭典交集 |
| 教育部辭典 + 自家規則 | 一起找錯字 12 道 curated + 519 程式生成 | 教育部公開 + 自家算法 |
| 國中 2000 英文字（使用者提供官方 PDF）| 英文快打 1946 字 | 萃取字面、未重刊 PDF |

**設計原則**：「授權不清楚 → 改寫」。商業教材一律萃取題型概念自家重寫；政府 / GitHub MIT 來源可直接引用。

---

## 技術架構

```
┌──────────────────────────────────────────────────────────┐
│                Frontend (React 18 + Vite)                 │
│  Tailwind CSS, React Router, React Context + useReducer   │
│  @hello-pangea/dnd (sorting), Web Speech API              │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTP /api/*
┌────────────────────────▼─────────────────────────────────┐
│                Backend (Express + TypeScript)             │
│  - authMiddleware (JWT)                                   │
│  - quizService (stem-aware LRU, dedupe)                   │
│  - errorMonsterService (SM-2-lite)                        │
│  - streakRewardService, pvpService                        │
└────────────────────────┬─────────────────────────────────┘
                         │ better-sqlite3 (sync API)
┌────────────────────────▼─────────────────────────────────┐
│       SQLite — database/redmushroom.db (WAL mode)         │
│  - users, questions, quiz_sessions, quiz_details          │
│  - user_stats (5D), error_monsters, pvp_ledger            │
└──────────────────────────────────────────────────────────┘
```

**Runtime 抽題**（`backend/src/services/quizService.ts`）：

1. 讀 `users.question_level` → 決定 Lv0 / Lv1
2. **Lv1**：建 `stemLastServed: Map<stem_key, last_ts>` → `rankBuckets` 按 stem-LRU 排序 → `pickDiverseQuestions` round-robin 8 個 category → `deduplicateByContent` 移除同 stem 變體
3. **Lv0**：跳過 LRU 與 stem dedupe，維持「同題可重複」行為

「題幹 (stem) key」= 題目文字 + 正解文字。同題的多個變體共享 stem，可正確折成同一題輪替。

---

## Demo 帳號

| 帳號 | 密碼 | 角色 |
|---|---|---|
| `student1` | `student123` | 學生 |
| `student2` | `student123` | 學生 |
| `teacher1` | `teacher123` | 老師（admin）|
| `sen_student` | `student123` | SEN 模式學生 |

---

## 專案結構

```
RedMushroom/
├─ frontend/                  React + Vite
│  ├─ src/pages/
│  │  ├─ Quiz.tsx                  ← 測驗主流程
│  │  ├─ SubjectSelector.tsx       ← 主頁面（tile + Lv toggle）
│  │  ├─ IdiomGame.tsx             ← 一字千金
│  │  ├─ FindMisuse.tsx            ← 一起找錯字
│  │  ├─ PoemAuthorGame.tsx        ← 是誰寫的詩
│  │  ├─ SanZiJingGame.tsx         ← 三字經
│  │  ├─ DiziguiGame.tsx           ← 弟子規
│  │  ├─ LunyuGame.tsx             ← 論語
│  │  ├─ TypingGame.tsx            ← 注音打字
│  │  ├─ WordTypingGame.tsx        ← 語詞快打
│  │  └─ EnglishTypingGame.tsx     ← 英文快打
│  ├─ src/context/                 ← Auth / Quiz / Config Context
│  └─ public/data/                 ← 遊戲用靜態題庫 JSON
│     ├─ idioms.json (208 KB)
│     ├─ misuse.json (196 KB)
│     ├─ poems.json (596 KB) + poem-authors.json
│     ├─ sanzijing.json (68 KB)
│     ├─ dizigui.json (76 KB)
│     ├─ lunyu.json (552 KB)
│     ├─ english-vocab.json (254 KB)
│     └─ common-words.json
│
├─ backend/                   Express + TS
│  ├─ src/services/quizService.ts  ← stem-aware LRU + dedupe
│  ├─ src/controllers/             ← authController (含 question_level)、quizController …
│  └─ data/dictionary.json         ← 教育部辭典 (43,986 entries)
│
├─ scripts/                   題庫萃取與工具
│  ├─ seed-extended.ts             ← 401 道手寫 chinese/nature/social/math
│  ├─ extract-idioms.py            ← 成語：簡轉繁 + 字頻過濾 + 注音
│  ├─ extract-misuse.py            ← 找錯字：同音字產生
│  ├─ extract-poems.py             ← 唐詩三百首 + 19 作者
│  ├─ extract-sanzijing.py         ← 三字經切句 + 注音
│  ├─ extract-dizigui.py           ← 弟子規切句 + 章節
│  ├─ extract-lunyu.py             ← 論語切句 + 30 白話解釋
│  ├─ add-classics-explanations.py ← 三字經/弟子規連句白話 patch
│  ├─ fix-sorting-alt.py           ← 排句子題加逆序 alt
│  ├─ dump-quiz-list.py            ← 倒題庫到 docs/quiz/LV0QuizList.MD
│  ├─ scrape/                      ← 外部資料萃取管線（gitignored）
│  └─ questions/                   ← 共用 zhuyinize / shuffle / templates
│
├─ database/
│  ├─ init.sql                     ← schema（auto-migrate via ensureColumn）
│  └─ redmushroom.db               ← runtime DB（gitignored）
│
├─ docs/quiz/LV0QuizList.MD        ← 題庫總覽快照（dump-quiz-list 產生）
│
├─ start.bat / Run.bat              ← 啟動
├─ reinstall.bat / reseed-db.bat    ← 故障救援
├─ add-extended.bat                 ← 加擴充題
├─ fix-sorting-alt.bat              ← 一次性 patch
└─ update.bat / update-no-git.bat   ← 多機同步
```

---

## 資料庫 Schema

關鍵欄位（完整見 `database/init.sql`）：

```sql
users
  user_id, username, password_hash, display_name, role, grade,
  total_exp,          -- 經驗值（只增不減，升等用）
  reward_points,      -- 兌換獎品分數（可花費）
  current_level, streak_days, max_streak,
  is_sen_mode,        -- 1 = 輕鬆學習模式（5 題、無時限）
  question_level,     -- 0 = 重複練習 / 1 = 多樣化（per-user）

questions
  question_id, subject, theory_type, category_type, question_type,
  content,            -- JSON: [{char, pinyin}, ...]
  options,            -- JSON: {"1": "...", "2": "...", ...}
  options_zhuyin,     -- JSON: per-option per-char zhuyin
  correct_answer,
  correct_answer_alt, -- 排句子可逆題的備用答案（| 分隔多個）
  explanation, score, ...

quiz_sessions
  session_id, user_id, theory_type, subject,
  start_time, end_time, total_score, is_passed

quiz_details
  detail_id, session_id, question_id, user_answer, is_correct,
  speech_text, speech_score
```

**Migrations** 由 `backend/src/db/database.ts` 的 `ensureColumn()` 自動處理 — 新增欄位後重啟後端即生效，舊 DB 不會壞。

---

## API Reference

```
POST   /api/auth/register
POST   /api/auth/login                 → { token, user }
GET    /api/auth/me                    → 含 question_level / 5D stats
PATCH  /api/auth/me                    ← { display_name?, question_level? }
POST   /api/quiz/start                 ← { theory_type, subject }
POST   /api/quiz/answer                ← { session_id, question_id, user_answer, speech_text?, speech_score? }
POST   /api/quiz/finish                ← { session_id }
POST   /api/quiz/game-score            ← { exp, reward, source }   ← 所有遊戲共用
GET    /api/dashboard/...              → 五維雷達 / 統計
GET    /api/leaderboard
POST   /api/pvp/start                  → 挑戰過去自己
GET    /api/error-monsters/due
POST   /api/error-monsters/answered
```

所有 `/api/quiz/*` 與 `/api/admin/*` 必須通過 `authMiddleware`，`req.user.user_id` 是唯一信任來源 — 防止 IDOR。

---

## SEN 模式（輕鬆學習）

`users.is_sen_mode = 1` 啟用：
- 每場 quiz **5 題**（一般 10 題）
- **無時限**
- 前端大字單欄排版、按鈕 ≥ 44px 點擊範圍
- 移除 streak 顯示 / 強烈動畫
- 字面**絕不出現「特教」「遲緩」**字眼，UI 顯示「🌟 輕鬆學習模式」

搭配 **Lv0 (重複練習)** 是 SEN 學生最佳組合 — 同概念反覆熟練、無壓力時間。

---

## 安全規範

- 所有涉及學生資料的 SQL **強制帶** `WHERE user_id = ?`（防 IDOR）
- 密碼 `bcrypt` rounds=12，禁止明文
- `JWT_SECRET` 由 `scripts/gen-jwt-secret.mjs` 產生，存 `backend/.env`（gitignored）
- `/api/quiz/start` 回傳題目**不含** `correct_answer`
- 統一 `try-catch` + Global Error Handler，不洩漏 stack trace
- `.gitignore` 守住：`.env` / `*.db` / `*.pdf` / `.tools/` / `node_modules/` / `scripts/scrape/.venv/` / `scripts/scrape/data/`（避免第三方 PDF 或 venv 流入 commit）

---

## Troubleshooting

| 症狀 | 原因 | 解法 |
|---|---|---|
| `NODE_MODULE_VERSION mismatch` | 系統 Node 24+ 但 better-sqlite3 是 Node 22 ABI | 雙擊 `start.bat`（自動下載 portable Node 22） |
| 主頁面 toggle 不見 | 舊 frontend bundle cache | 瀏覽器 Ctrl+Shift+R |
| Lv1 還是出重複題 | 後端沒重啟（migration 沒跑） | 關掉 npm start window，再雙擊 start.bat |
| 排句子答對的卻判錯 | 該對句沒在 `correct_answer_alt` 名單 | 跑 `fix-sorting-alt.bat`（補 216 道）|
| Cognitive 還是重複 | 題庫太小 (118 stems) | 跑 `add-extended.bat` 加新題 |
| `'nstall' 不是內部或外部命令` | `.bat` 是 LF 行尾被 cmd 誤切 | 用最新 `.bat`（CRLF + chcp 65001） |
| Login: `Unexpected end of JSON input` | 後端跑系統 Node 24 但 better-sqlite3 是 Node 22 binary → crash | 用 `start.bat` 啟動（portable Node 22 上 PATH）|

---

## 開發指令

```bash
npm run setup            # 首次：建 DB + 跑所有 seeds
npm start                # 同啟前後端 (concurrently)
npm run build            # 生產 build
npm run test:e2e         # Playwright E2E
npm run test:child       # AI 兒童測試員

cd backend && npm run dev
cd frontend && npm run dev
```

擴充 / patch DB：
```bash
雙擊  add-extended.bat        # +401 題到既有 DB
雙擊  fix-sorting-alt.bat     # 排句子題加逆序 alt
python3 scripts/dump-quiz-list.py   # 生 docs/quiz/LV0QuizList.MD
```

萃取新題庫（會更新 `frontend/public/data/*.json`，要重 build frontend）：
```bash
cd scripts/scrape && python3 -m venv .venv
.venv/bin/pip install opencc-python-reimplemented pdfplumber pymupdf beautifulsoup4 requests
.venv/bin/python3 ../extract-idioms.py
.venv/bin/python3 ../extract-poems.py
.venv/bin/python3 ../extract-sanzijing.py
.venv/bin/python3 ../extract-dizigui.py
.venv/bin/python3 ../extract-lunyu.py
.venv/bin/python3 ../extract-misuse.py
python3 scripts/add-classics-explanations.py    # 三字經/弟子規連句白話 patch
```

---

## License

MIT License — see [LICENSE](LICENSE).

**字型授權各自獨立**：
- `BpmfHuninn`, `BpmfGenYoGothic`, `BpmfGenSenRounded`, `BpmfZihiSerif`, `BpmfZihiKai`, `BpmfIansui`, `HanWangKaiAnnotated`, `HanWangMingPolyphonic1` — 各字型遵守自家 LICENSE（皆 OFL / GPL 派生，允許免費使用）。

**題庫 / 內容授權**：
- 自家寫的題目模板與擴充題 — MIT
- 教育部國語辭典 — 政府公開資料
- chinese-poetry/chinese-poetry — 古文公共領域、整理 MIT
- 國中 2000 英文字 — 萃取字面，未重刊原 PDF
- 簡體成語來源資料 — opencc 簡轉繁 + 教育部辭典交集，僅留國小可懂

---

## Acknowledgements

- 教育部國語推行委員會 — 國語辭典與成語典資料
- [chinese-poetry/chinese-poetry](https://github.com/chinese-poetry/chinese-poetry) — 唐詩、三字經、弟子規、論語整理
- 均一教育平台 — 教學內容靈感來源
- Bopomofo 字型作者群（Huninn / GenYo / GenSen / Zihi / Iansui 等）

🍄 **RedMushroom** — 讓每個孩子都能在自己的節奏裡學會中文。
