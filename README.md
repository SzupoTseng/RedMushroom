# RedMushroom（紅蘑菇）🍄

> Digital Chinese & Math Learning System for Elementary School (Grades 3–4)
> 國小 3-4 年級國語文／數學數位學習系統

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Language / 語言：** [English](#english) | [繁體中文](#繁體中文)

---

## English

### Table of Contents

1. [Features](#features)
2. [Quick Start](#quick-start)
3. [Demo Accounts](#demo-accounts)
4. [Project Structure](#project-structure)
5. [Tech Stack](#tech-stack)
6. [Architecture](#architecture)
7. [Database Schema](#database-schema)
8. [API Reference](#api-reference)
9. [Question Generation System](#question-generation-system)
10. [SEN Mode Design](#sen-mode-design)
11. [Multi-Subject Modules](#multi-subject-modules)
12. [Testing](#testing)
13. [Security](#security)
14. [Development Workflow](#development-workflow)
15. [Troubleshooting](#troubleshooting)
16. [License](#license)

---

### Features

- 🧠 **4 Learning Theories**: Cognitive, Input, Usage, Sociocultural — every quiz exercises a single theory.
- 📚 **~1,500 Chinese + 32 Math Questions**: 32-template matrix (4 theory × 8 category × prompt variants) + 57 Taiwan-localised seeds + 32 hand-crafted math problems in Taiwan contexts (NTD, 坪, YouBike, 健保 etc.).
- 🎲 **Stratified Sampling**: Each 10-question quiz draws from all 8 life-context categories so no two questions feel identical.
- 🎮 **RPG Progress System**: EXP, levels, win streaks, Grammar Sprite pet that evolves with theory-specific XP.
- 🔥 **Daily Streak Rewards**: Treasure chest auto-unlocks at 7 / 14 / 30 days (title / pet skin).
- 🐲 **Error Monsters**: SM-2-lite spaced repetition (6h / 24h / 72h / 168h / 336h intervals; 3 consecutive corrects "purifies" the monster).
- ⚔️ **Async PvP Arena**: Challenge the median of your own past 5 sessions — race yesterday's you, not your classmates.
- 🏆 **Class Hero Leaderboard**: Classmates' names privacy-masked to first-character + 同學 (e.g. 「林同學」).
- 🎤 **Speech Bonus XP**: Web Speech API (zh-TW); +5 XP for ≥70% Dice-bigram similarity on read-aloud.
- 📊 **6-Dimension Radar**: Accuracy, Stability, Breadth, Cognitive, Endurance, Fluency.
- 🌟 **SEN-Friendly Mode**: "輕鬆學習模式" — 5 questions, larger fonts, single-column layout, 1.8s anti-mistap cooldown, dedicated 50+ praise lines, mascot hides for distraction-free learning. **Never uses clinical terminology in the UI.**
- 💬 **555-line Praise Library**: 503 general + 52 SEN-specialty across 7 scenarios × 3 tones. Last 20 used are excluded from the next pick so kids rarely see the same encouragement twice.
- 📱 **QR Code Parent Portal**: 5-minute one-time token (UUID v4) — no cloud account or app install needed.
- 👩‍🏫 **Teacher Dashboard**: Class overview, PDF reports, CSV export.
- 🌐 **Multi-language UI**: zh-TW / English / Japanese / Korean (curriculum stays Mandarin; the chrome is global).
- 🐹 **AI Child Tester**: Built-in 4-persona Playwright simulator (careful / random / speedy / guesser) for UX stress testing.
- 📦 **Code-split frontend**: Initial JS bundle 170KB (gzip 55KB); each page loads on demand.

---

### Quick Start

#### Windows (recommended for teachers)

**First-time install** (2–5 minutes):

```
Double-click  start.bat
```

This installs Node deps, builds the SQLite DB, seeds demo questions and praises, and starts the servers.

**Daily startup** (5 seconds):

```
Double-click  Run.bat
```

`Run.bat` checks the environment, starts backend (`:3001`) + frontend (`:5173`) concurrently, and auto-opens the default browser to http://localhost:5173 once Vite is ready.

#### macOS

```
Double-click  start.command
(First time: chmod +x start.command  in Terminal)
```

#### Linux / WSL / developers

```bash
npm run setup     # First run only: install deps + create DB + seed
npm start         # Start frontend + backend (Ctrl+C twice to stop)
```

#### One-off seed commands

```bash
npm run seed:questions   # ~1500 Chinese questions from 32 templates
npm run seed:tw          # 57 Taiwan-localised Chinese questions
npm run seed:math        # 32 math questions (4 theory × 8 category)
npm run seed:praise      # 555 praise lines (general + SEN)
```

---

### Demo Accounts

| Username | Password | Role | Notes |
|----------|----------|------|-------|
| `teacher` | `teacher123` | Teacher | Has `/admin` dashboard access |
| `student1` | `student123` | Student | `class_id = class-A` for leaderboard / PvP demos |

To enable SEN mode for a student manually:

```sql
UPDATE users SET is_sen_mode = 1 WHERE username = 'student1';
```

Or via Node REPL from project root:

```bash
node -e "const db = require('./backend/node_modules/better-sqlite3')('./database/redmushroom.db'); db.prepare(\"UPDATE users SET is_sen_mode=1 WHERE username='student1'\").run();"
```

The backend reads `is_sen_mode` from the DB on every `/api/quiz/start`, so the next quiz will be 5 questions instead of 10.

---

### Project Structure

```
RedMushroom/
├── frontend/                       # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx                 # Lazy-loaded routes + Suspense
│   │   ├── pages/                  # 9 page-level components
│   │   ├── components/             # quiz/, common/
│   │   ├── context/                # AuthContext, QuizContext, ConfigContext
│   │   ├── hooks/                  # useSpeechRecognition
│   │   ├── i18n/                   # 4 locales
│   │   └── types/                  # Shared TS types
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── backend/                        # Express + TS + better-sqlite3
│   ├── src/
│   │   ├── index.ts                # Express bootstrap
│   │   ├── app.ts                  # Middleware + router wiring
│   │   ├── routes/                 # auth.ts, quiz.ts, admin.ts
│   │   ├── controllers/            # HTTP layer (5 controllers)
│   │   ├── services/               # Business logic + DB (7 services)
│   │   ├── middlewares/            # authMiddleware, errorHandler
│   │   ├── db/database.ts          # getDb() singleton
│   │   ├── models/                 # Intentionally empty (see README)
│   │   └── repositories/           # Intentionally empty (see README)
│   ├── vitest.config.ts
│   └── .env.example
│
├── database/
│   ├── init.sql                    # 11-table schema + indexes
│   ├── upgrade_schema.sql          # Future migrations
│   └── redmushroom.db              # generated, gitignored
│
├── scripts/
│   ├── setup.mjs                   # Cross-platform installer
│   ├── init-db.ts                  # Apply init.sql
│   ├── seed-minimal.ts             # 10 demo questions + 12 praises + 2 users
│   ├── generate-questions.ts       # Build Chinese matrix from templates
│   ├── seed-questions-taiwan.ts    # 57 Taiwan-localised Chinese questions
│   ├── seed-math.ts                # 32 math questions
│   ├── seed-praise-library.ts      # 555 praise lines
│   ├── questions/                  # Template definitions for matrix
│   │   ├── templates.ts            # 32 Chinese templates + 4-variant prompts
│   │   ├── matrix.ts               # Row builder + prompt rotation
│   │   └── zhuyin.ts               # 注音 char→pinyin lookup
│   └── praises/                    # Praise corpora
│       ├── general.ts              # 503 lines
│       └── sen.ts                  # 52 lines
│
├── modules/                        # Multi-subject configs
│   ├── MODULE_SPEC.md
│   ├── chinese/module.config.json  # active
│   ├── math/module.config.json     # active
│   ├── english/module.config.json  # stub (isActive: false)
│   ├── nature/module.config.json   # stub
│   └── social/module.config.json   # stub
│
├── tests/
│   ├── e2e/quiz-flow.spec.ts       # 5 Playwright specs × 2 projects (Chromium + Mobile Chrome)
│   └── ai-child-tester.ts          # 4-persona Playwright simulator
│
├── docs/
│   ├── superpowers/plans/          # Implementation plans
│   ├── marketing/                  # HN / PH / Reddit launch copy
│   ├── business/open-core-plan.md
│   └── ...
│
├── .github/
│   ├── ISSUE_TEMPLATE/             # bug_report, feature_request, config
│   └── PULL_REQUEST_TEMPLATE.md
│
├── start.bat              # Windows: first-time install + launch
├── start.command          # macOS: first-time install + launch
├── Run.bat                # Windows: daily start (no reinstall)
├── reinstall.bat          # Windows: fix WSL-installed node_modules
├── playwright.config.ts
├── Dockerfile             # Single-container production build
├── docker-compose.prod.yml
├── CLAUDE.md              # Strict architectural rules
├── CONTRIBUTING.md
├── AGENTS.md
├── PLAN.MD                # 19-stage build plan + 2026-05-20 reality check
└── README.md
```

---

### Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend framework | React 18 + TypeScript + Vite | Industry standard; Vite gives sub-second HMR |
| Styling | Tailwind CSS | Utility-first; custom `mushroom-*` palette in `tailwind.config.ts` |
| State (quiz) | Context + useReducer | No Redux needed for this scope |
| Routing | react-router-dom v6 | with `React.lazy` per route for code-split |
| Charts | Recharts | Radar + Bar; lazy-loaded only on dashboards |
| Drag & drop | @hello-pangea/dnd | Used in sorting-type questions |
| Speech | Web Speech API | Chrome/Edge only; falls back gracefully (no UI) elsewhere |
| Backend | Node.js (≥18) + Express + TypeScript | |
| Database | SQLite via `better-sqlite3 v11` | Synchronous, single-file, zero-install |
| Auth | JWT + bcrypt (12 rounds) | Tokens expire in 7 days |
| PDF | `pdfkit` | Student report exports |
| QR | `qrcode` | Parent-portal 5-min token |
| UUID | `uuid` v9 | mobile_linking_tokens |
| Test runner (backend) | `vitest 4` | 17 unit tests |
| Test runner (E2E) | Playwright | 5 specs × 2 projects (Chromium / Mobile Chrome) |
| Dev concurrency | `concurrently` (root dep) | Single command starts both servers |
| TS executor | `tsx` | Used in scripts & dev mode |

---

### Architecture

#### Backend Layered View

```
HTTP request
   ↓
[ routes/ ]              Mounted under /api/{auth,quiz,admin}; authMiddleware enforces JWT.
   ↓
[ controllers/ ]         Parse req, validate, format responses. No business logic.
   ↓
[ services/ ]            Business logic. Talks to getDb() directly. Returns plain JS objects.
   ↓
[ db/database.ts ]       Singleton better-sqlite3 instance with WAL mode + foreign keys ON.
```

**No model / repository layer** — services own their SQL. See `backend/src/models/README.md`.

#### Frontend Provider Order

```
<BrowserRouter>
  <AuthProvider>          Reads JWT from localStorage, hydrates user via /api/auth/me
    <ConfigProvider>      Zhuyin toggle, font size, language; useSenLayout() derives SEN from user×config
      <QuizProvider>      Per-quiz state machine (LOBBY → LOADING → QUIZ → SUBMITTING → RESULT)
        <Routes>          Lazy-loaded pages
```

`useSenLayout()` returns `true` if either `user.is_sen_mode` is set server-side **or** the user manually flipped fontSize to 'large' — both paths converge to the same accessible layout.

---

### Database Schema

11 tables in `database/init.sql`. Highlights:

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `users` | Accounts | `user_id`, `username`, `password_hash` (bcrypt 12), `role`, `class_id`, `total_exp`, `current_level`, `streak_days`, `is_sen_mode` |
| `questions` | Question bank | `subject`, `theory_type` (4 enum), `category_type` (8 enum), `question_type` (single_choice / sorting), `content` (JSON ZhuyinChar[]), `options` (JSON), `correct_answer`, `explanation` |
| `quiz_sessions` | Quiz runs | `session_id`, `user_id`, `theory_type`, `total_score`, `is_passed`, `duration_seconds`, `pvp_mode`, `pvp_target_score`, `pvp_target_secs` |
| `quiz_details` | Per-answer log | `session_id`, `question_id`, `user_answer`, `is_correct`, `speech_score`, `speech_text` |
| `praise_library` | 555 praise lines | `scenario_type` (7 enum incl. `sen_encouragement`), `tone_type` (enthusiastic / growth_mindset / humorous), `content` |
| `user_praise_history` | Anti-repeat ledger | last 20 excluded from next pick |
| `user_stats` | 6-dim cache | `accuracy / stability / versatility / cognition / endurance / fluency` |
| `user_error_monsters` | Spaced rep state | `streak_correct`, `next_review_time`, `status` (active / purified) |
| `user_items` | Reward inventory | titles, pet skins from streak milestones |
| `user_sprites` | Grammar pet | `current_form` (egg / baby / knight / god), per-theory XP |
| `mobile_linking_tokens` | QR parent portal | UUID v4, one-time, 5-min expiry |

**All `theory_type` ∈** `{cognitive, input, usage, sociocultural}`.
**All `category_type` ∈** `{food_shopping, social, travel, business, health, leisure, housing, digital}`.

---

### API Reference

All routes under `/api/quiz/*` and `/api/admin/*` require `Authorization: Bearer <jwt>`.

#### Auth

| Method | Path | Body / Params | Returns |
|--------|------|---------------|---------|
| POST | `/api/auth/register` | `{username, password, display_name, grade}` | `201 {message, user_id}` |
| POST | `/api/auth/login` | `{username, password}` | `{token, user}` (user has level/streak/SEN flags) |
| GET | `/api/auth/me` | (token only) | `{user}` (full profile incl. 6-dim stats) |

#### Quiz

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/quiz/subjects` | List active subjects |
| GET | `/api/quiz/me/report` | Self student report (level, sessions, error monsters) |
| POST | `/api/quiz/start` | `{theory_type, subject}` → returns 10 (or 5 for SEN) questions **without `correct_answer`**. Stratified across 8 categories. |
| POST | `/api/quiz/answer` | `{session_id, question_id, user_answer, speech_text?, speech_score?}` → `{is_correct, explanation}`. Updates error-monster state; +5 XP if speech ≥ 70%. |
| POST | `/api/quiz/finish` | `{session_id}` → final score, level-up flag, praise, streak_days, reward (or null) |
| GET | `/api/quiz/session/:id` | Full session with all answers (for Result page + PvP comparison) |
| GET | `/api/quiz/monsters` | Due error monsters (≤ 20, `next_review_time ≤ now`) |
| POST | `/api/quiz/monsters/review` | `{question_id, user_answer}` → updates SM-2 streak |
| GET | `/api/quiz/leaderboard` | Class ranking; non-self names masked to first-char + 同學 |
| GET | `/api/quiz/pvp/classmates` | Same class peers (no full names exposed) |
| POST | `/api/quiz/pvp/challenge` | Creates a session with target = median(last 5 wins) |

#### Admin (teacher role required)

| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/dashboard` | Class stats + weekly quiz count |
| GET | `/api/admin/class/stats` | Per-student aggregate |
| GET | `/api/admin/student/:userId/report` | One student's full report (IDOR-checked) |
| GET | `/api/admin/student/:userId/pdf` | PDF student report (PDFKit) |
| GET | `/api/admin/class/export/csv` | CSV class export |
| POST | `/api/admin/student/:userId/qr` | Generate 5-min QR linking token for parent portal |

#### Pass Threshold

```js
const maxScore = sum(question.score for question in quiz);
const passThreshold = Math.ceil(maxScore * 0.6);
const isPassed = totalScore >= passThreshold;
```

This means normal mode (10 × 10 = 100, threshold 60) and SEN mode (5 × 10 = 50, threshold 30) require the same **proportional** mastery.

---

### Question Generation System

The Chinese question bank is **generated**, not hand-written.

#### File Layout

- `scripts/questions/templates.ts` — 32 template entries (4 theory × 8 category). Each declares:
  - `data` (coupled fields like `{word, right}` so word→meaning stays correct)
  - `vars` (independent cartesian axes like wrong-answer pools)
  - `prompts` (3–4 variant phrasings rotated by row index)
- `scripts/questions/matrix.ts` — Cross-joins `data` × `vars`, picks a prompt by `rowIdx % prompts.length`.
- `scripts/questions/zhuyin.ts` — Char → 注音 lookup; unknown chars get empty pinyin (acceptable).

#### Stratified Sampling at Quiz Time

`quizService.getBucketsByCategory(subject, theory_type)` caches questions grouped by `category_type` (5-min TTL). `pickDiverseQuestions(buckets, count)` round-robins picks across all 8 buckets, so a normal quiz spans 8 categories and a SEN quiz spans 5 — eliminating the "all 10 questions feel the same" problem.

#### Adding More Questions

```bash
# Edit a template's data[] (e.g. add a new word + meaning row)
$EDITOR scripts/questions/templates.ts

# Regenerate (idempotent: INSERT OR IGNORE)
npm run seed:questions
```

---

### SEN Mode Design

"SEN" (Special Educational Needs) — referred to **only** as "輕鬆學習模式" in the UI.

**Server-side adaptations** (`is_sen_mode = 1`):

- Quiz size: 10 → **5** questions (`quizService.startQuiz`)
- Praise pool: routes to `sen_encouragement` scenario (52 dedicated lines)
- Pass threshold: scales to 60% of `maxScore`, so SEN's 50-point ceiling can still pass at 30

**Client-side adaptations** (`useSenLayout() === true`):

- Container width: `max-w-2xl` → `quiz-board-sen` (narrower, single column)
- Button size: `text-lg` `min-h-[56px]` → `answer-btn-sen` (`text-2xl` `py-6` `min-h-[80px]`, `rounded-3xl`)
- Cooldown: 1.2s → **1.8s** between answer click and next question (anti-mistap)
- Mascot: `BiBoFloatingSprite` returns `null` (no distractions)
- Zhuyin: 24pt → 30pt with wider gap
- Fire/streak indicator: drops the bounce animation
- Progress bar text: small → base

**Hard rules**:
- The strings "遲緩" / "特教" / "障礙" / "special needs" must never appear in any UI surface.
- All SEN code paths are behind a single hook `useSenLayout()` for traceability.

---

### Multi-Subject Modules

Subject modules live in `modules/<subject>/module.config.json`.

```json
{
  "subject": "math",
  "displayName": "數學",
  "displayNameI18n": { "zh-TW": "數學", "en": "Math", "ja": "算数", "ko": "수학" },
  "icon": "🔢",
  "color": "#3b82f6",
  "theoryTypes": ["cognitive", "input", "usage", "sociocultural"],
  "questionTypes": ["single_choice"],
  "gradeLevels": ["3", "4"],
  "isActive": true,
  "description": "..."
}
```

| Subject | Status | Seed source |
|---------|--------|-------------|
| `chinese` | active | `seed-questions` + `seed-questions-taiwan` (~1500 + 57) |
| `math` | active | `seed-math` (32 hand-crafted Taiwan contexts) |
| `english` | stub (`isActive: false`) | placeholder config only |
| `nature` | stub | placeholder config only |
| `social` | stub | placeholder config only |

All subjects share the same DB schema (`subject` column on `questions`). The frontend reads `/api/quiz/subjects` to enumerate active subjects.

To add a new subject — see `modules/MODULE_SPEC.md`.

---

### Testing

```bash
# Backend unit tests (vitest)
cd backend && npm test               # 17/17 tests across 4 files

# End-to-end (Playwright)
npm run test:e2e                     # 5 specs × 2 projects = 10 tests

# AI child tester (Playwright-driven)
npm run test:child                   # 1 quiz, persona rotates per run
npm run test:child:batch             # 50 quizzes with random personas
```

#### Vitest coverage

| File | Covers |
|------|--------|
| `quizService.test.ts` | SEN user → `sen_encouragement` pool routing |
| `errorMonsterService.test.ts` | SM-2-lite create / increment / purify / hide-future |
| `streakRewardService.test.ts` | Milestone unlock + idempotence |
| `pvpService.test.ts` | Median target + weighted comparison |

#### Playwright coverage

| Spec | Assertion |
|------|-----------|
| Login page renders | Visible RedMushroom logo + username input |
| Login with demo student | Lands on "今天要練習哪個主題？" within 10s |
| Start quiz flow | Answer button visible after theory click |
| IDOR: session result without token | Returns 401 |
| `/api/quiz/start` payload | No `correct_answer` key in any question |

#### AI Child Tester Personas

| Persona | Behaviour | Use case |
|---------|-----------|----------|
| `careful` | 80% picks the correct option (1), 20% random | Models attentive students |
| `random` | Uniform random across 4 options | Statistical baseline |
| `speedy` | Always picks option 1 | Fastest path to ✅ |
| `guesser` | Picks the longest option text | Heuristic baseline |

Each persona has different `thinkTime` distributions matching real classroom rhythm.

---

### Security

- **IDOR**: every SQL query touching student data carries `WHERE user_id = ?`. The JWT-decoded `req.user.user_id` is the only trusted source — request params are checked against it.
- **No `correct_answer` leak**: `quizService.startQuiz()` builds `questionsForClient[]` by explicitly omitting the field. Playwright asserts every question key set.
- **bcrypt 12 rounds** for password hashing (≈ 300ms on a laptop — slow enough to defeat dictionary attacks).
- **JWT 7-day expiry**; secret read from `backend/.env`.
- **CORS**: only `http://localhost:5173` / `:3000` allowed in dev; closed in production.
- **QR parent-portal tokens**: UUID v4, one-time use, 5-minute expiry, marked `expired` once redeemed.
- **No `ORDER BY RANDOM()` over full tables** in any hot path — Fisher-Yates over an in-memory cache (`quizService.getBucketsByCategory`, 5-min TTL).
- **SEN labels** never leak clinical terminology to the UI (zh-TW / en / ja / ko all sanitised).
- **No `any` types** in TypeScript — every API boundary has an interface.

See `CLAUDE.md` for the full ruleset; PRs are reviewed against it.

---

### Development Workflow

```bash
# First-time setup
npm run setup

# Daily — start both servers (Ctrl+C twice to stop)
npm start

# Production build
npm run build
# → backend/dist/  +  frontend/dist/

# Backend tests
cd backend && npm test

# Frontend typecheck
cd frontend && npx tsc --noEmit

# E2E
npm run test:e2e

# Re-seed DB without losing user data
# (questions/praise inserts are INSERT OR IGNORE)
npm run seed:questions
npm run seed:tw
npm run seed:math
npm run seed:praise

# Hard reset DB (loses everything)
rm database/redmushroom.db
npm run setup
```

#### Hot reload

- Backend: `tsx watch src/index.ts` — auto-reloads on file change
- Frontend: `vite` — sub-second HMR

#### Database file handle gotcha

Backend opens `database/redmushroom.db` once at boot. If you `rm` and regenerate it while the backend is running, the backend keeps writing to the deleted-but-still-open inode. **Restart the backend after any `rm database/*`**.

---

### Troubleshooting

#### `'concurrently' is not recognized` on Windows

You almost certainly ran `npm install` from **WSL / Linux** on the shared NTFS partition. WSL's npm creates Linux symlinks in `node_modules/.bin/`, but Windows CMD needs `.cmd` / `.ps1` shims.

**Fix:**

```cmd
Double-click  reinstall.bat
```

This wipes `root/backend/frontend/node_modules` and re-runs `npm install` from Windows-native npm, which generates the correct `.cmd` shims.

#### `better-sqlite3` native compile fails

Cause: Node version is too new and no prebuilt binary exists yet (e.g. Node 25 came out before `better-sqlite3 11.5` published a matching prebuild).

**Fix A (easiest):** install Node 22 LTS instead. Then `npm install` will use the prebuild.

**Fix B (build from source):** install [Visual Studio Build Tools](https://aka.ms/vs/17/release/vs_BuildTools.exe) → C++ Desktop Development → reinstall.

#### `mushroom-300` / `mushroom-400` CSS errors

You're on an old `tailwind.config.ts` missing those shades. Pull `main` — current config has the full 50–900 scale.

#### Playwright tests can't start the dev server

```
Error: http://localhost:5173 is already used
```

You started servers manually before running tests. Either kill them (`pkill -f vite`) or set `reuseExistingServer: true` in `playwright.config.ts` (already on by default unless `CI=1`).

#### Demo student can't pass SEN quizzes

Old code had a hard-coded `>= 60` pass threshold; SEN's 50-point ceiling made passing impossible. Current code uses `>= 60% of max` so SEN passes at ≥ 30. If you forked before 2026-05-21, pull `main`.

#### `npm run test:child` fails immediately

Playwright browser binaries aren't installed:

```bash
npx playwright install chromium
```

---

### License

MIT License — free for use and adaptation in schools worldwide. Trademarks "RedMushroom" / "紅蘑菇" are reserved for the maintainer's hosted SaaS; **forks must rebrand** if commercialised. See `docs/business/open-core-plan.md`.

---
---

## 繁體中文

### 目錄

1. [特色功能](#特色功能)
2. [快速開始](#快速開始)
3. [示範帳號](#示範帳號)
4. [目錄結構](#目錄結構)
5. [技術架構](#技術架構)
6. [系統架構](#系統架構)
7. [資料庫 Schema](#資料庫-schema)
8. [API 參考](#api-參考)
9. [題目生成系統](#題目生成系統)
10. [SEN 模式設計](#sen-模式設計)
11. [多科目模組](#多科目模組)
12. [測試](#測試)
13. [安全設計](#安全設計)
14. [開發流程](#開發流程)
15. [疑難排解](#疑難排解)
16. [授權](#授權)

---

### 特色功能

- 🧠 **四大學習主題**：語詞認知、語言輸入、語言運用、社文語境；每場測驗鎖定單一主題。
- 📚 **約 1500 道國語文題目 + 32 道數學題目**：32 模板矩陣（4 主題 × 8 類別 × 多句型）+ 57 道臺灣在地化題目 + 32 道手寫的臺灣情境數學題（新臺幣、坪、YouBike、健保）。
- 🎲 **分層抽題**：每場 10 題從 8 個生活情境輪流抽，不會出現 10 題長一樣的狀況。
- 🎮 **RPG 成長系統**：經驗值、等級、連勝、文法小精靈寵物（依四主題 XP 進化）。
- 🔥 **每日連勝寶箱**：7／14／30 天自動解鎖獎勵（稱號／寵物造型）。
- 🐲 **錯題怪獸**：SM-2-lite 間隔重複（6h／24h／72h／168h／336h；連續答對 3 次「淨化」）。
- ⚔️ **班級競技場**：挑戰過去 5 場自己的中位數——挑戰昨天的你，而不是同學。
- 🏆 **班級英雄榜**：同學姓名隱碼成「首字＋同學」（如「林同學」）保護隱私。
- 🎤 **語音加分**：Web Speech API（zh-TW）；唸題相似度 ≥70% 答對 +5 XP。
- 📊 **六維度雷達**：準確率、穩定性、廣泛性、認知、耐力、流暢。
- 🌟 **SEN 友善模式**：「輕鬆學習模式」——5 題、大字體、單欄、1.8 秒防誤觸 cool-down、50+ 專屬讚美語、吉祥物自動隱藏。**前端絕對不出現任何臨床術語。**
- 💬 **555 條讚美庫**：503 條一般 + 52 條 SEN 專屬，7 種情境 × 3 種語氣。最近用過的 20 條會被排除，幾乎不會看到重複。
- 📱 **QR Code 家長入口**：5 分鐘一次性 token（UUID v4）——零雲端帳號、不用裝 app。
- 👩‍🏫 **老師管理台**：班級總覽、PDF 報告、CSV 匯出。
- 🌐 **多語言介面**：繁中／英／日／韓（題目維持中文，介面 chrome 多語）。
- 🐹 **AI 兒童測試員**：內建 4 種 persona 的 Playwright 模擬器（認真／隨機／速答／猜長）做 UX 壓測。
- 📦 **前端 code-split**：初始 JS bundle 170KB（gzip 55KB），各分頁按需載入。

---

### 快速開始

#### Windows（給老師）

**首次安裝**（2-5 分鐘）：

```
雙擊  start.bat
```

會自動裝依賴、建 DB、植入示範題庫與帳號，然後啟動。

**日常啟動**（5 秒）：

```
雙擊  Run.bat
```

`Run.bat` 做環境檢查、同時啟動後端（`:3001`）與前端（`:5173`），等 Vite ready 後自動以預設瀏覽器開 http://localhost:5173。

#### macOS

```
雙擊  start.command
（首次需在終端機執行：chmod +x start.command）
```

#### Linux / WSL / 開發者

```bash
npm run setup     # 首次：裝依賴 + 建 DB + 植入示範資料
npm start         # 同時啟動前後端（Ctrl+C 兩次關閉）
```

#### 單獨重 seed

```bash
npm run seed:questions   # ~1500 道由 32 模板生成的國語文題
npm run seed:tw          # 57 道臺灣在地化國語文題
npm run seed:math        # 32 道數學題（4 主題 × 8 類別）
npm run seed:praise      # 555 條讚美語（一般 + SEN）
```

---

### 示範帳號

| 帳號 | 密碼 | 角色 | 備註 |
|------|------|------|------|
| `teacher` | `teacher123` | 老師 | 可進入 `/admin` 後台 |
| `student1` | `student123` | 學生 | `class_id = class-A`，可看到 leaderboard / PvP 示範 |

要手動開啟 SEN 模式：

```sql
UPDATE users SET is_sen_mode = 1 WHERE username = 'student1';
```

或從專案根目錄用 Node REPL：

```bash
node -e "const db = require('./backend/node_modules/better-sqlite3')('./database/redmushroom.db'); db.prepare(\"UPDATE users SET is_sen_mode=1 WHERE username='student1'\").run();"
```

後端在每次 `/api/quiz/start` 都會從 DB 讀 `is_sen_mode`，所以下一場測驗會變成 5 題（原本 10 題）。

---

### 目錄結構

```
RedMushroom/
├── frontend/                       # React 18 + Vite + Tailwind
│   ├── src/
│   │   ├── App.tsx                 # lazy-load routes + Suspense
│   │   ├── pages/                  # 9 個頁面
│   │   ├── components/             # quiz/, common/
│   │   ├── context/                # AuthContext, QuizContext, ConfigContext
│   │   ├── hooks/                  # useSpeechRecognition
│   │   ├── i18n/                   # 4 語系
│   │   └── types/                  # 共用 TS 型別
│   ├── tailwind.config.ts
│   └── vite.config.ts
│
├── backend/                        # Express + TS + better-sqlite3
│   ├── src/
│   │   ├── index.ts                # Express 啟動點
│   │   ├── app.ts                  # middleware + router 串接
│   │   ├── routes/                 # auth.ts, quiz.ts, admin.ts
│   │   ├── controllers/            # HTTP 層（5 個 controller）
│   │   ├── services/               # 商業邏輯 + DB（7 個 service）
│   │   ├── middlewares/            # authMiddleware, errorHandler
│   │   ├── db/database.ts          # getDb() 單例
│   │   ├── models/                 # 故意留空（見內 README）
│   │   └── repositories/           # 故意留空（見內 README）
│   ├── vitest.config.ts
│   └── .env.example
│
├── database/
│   ├── init.sql                    # 11 張表 + 索引
│   ├── upgrade_schema.sql          # 將來的 migration
│   └── redmushroom.db              # 生成檔，gitignore
│
├── scripts/
│   ├── setup.mjs                   # 跨平台安裝
│   ├── init-db.ts                  # 套用 init.sql
│   ├── seed-minimal.ts             # 10 道示範題 + 12 條讚美 + 2 個帳號
│   ├── generate-questions.ts       # 從模板生 ~1500 道中文題
│   ├── seed-questions-taiwan.ts    # 57 道臺灣在地化中文題
│   ├── seed-math.ts                # 32 道數學題
│   ├── seed-praise-library.ts      # 555 條讚美
│   ├── questions/                  # 模板定義
│   │   ├── templates.ts            # 32 個中文模板 + 4 種 prompt 句型
│   │   ├── matrix.ts               # row builder + prompt 輪流
│   │   └── zhuyin.ts               # 注音字符對照表
│   └── praises/
│       ├── general.ts              # 503 條
│       └── sen.ts                  # 52 條
│
├── modules/                        # 多科目 config
│   ├── MODULE_SPEC.md
│   ├── chinese/module.config.json  # active
│   ├── math/module.config.json     # active
│   ├── english/module.config.json  # stub
│   ├── nature/module.config.json   # stub
│   └── social/module.config.json   # stub
│
├── tests/
│   ├── e2e/quiz-flow.spec.ts       # 5 個 Playwright spec × 2 project
│   └── ai-child-tester.ts          # 4 種 persona 模擬器
│
├── docs/
│   ├── superpowers/plans/          # 實作計畫
│   ├── marketing/                  # HN / PH / Reddit 行銷文案
│   ├── business/open-core-plan.md
│   └── ...
│
├── .github/
│   ├── ISSUE_TEMPLATE/             # bug_report, feature_request, config
│   └── PULL_REQUEST_TEMPLATE.md
│
├── start.bat              # Windows 首次安裝 + 啟動
├── start.command          # macOS 首次安裝 + 啟動
├── Run.bat                # Windows 日常啟動（免重灌）
├── reinstall.bat          # Windows 修復 WSL 灌的 node_modules
├── playwright.config.ts
├── Dockerfile             # 單容器 production build
├── docker-compose.prod.yml
├── CLAUDE.md              # 嚴格的架構規範
├── CONTRIBUTING.md
├── AGENTS.md
├── PLAN.MD                # 19 階段建構藍圖 + 2026-05-20 完工驗證
└── README.md
```

---

### 技術架構

| 層次 | 技術 | 為什麼 |
|------|------|--------|
| 前端框架 | React 18 + TypeScript + Vite | 業界主流；Vite 提供秒級 HMR |
| 樣式 | Tailwind CSS | 自訂 `mushroom-*` 色票於 `tailwind.config.ts` |
| 測驗狀態 | Context + useReducer | 規模還用不到 Redux |
| 路由 | react-router-dom v6 | 搭配 `React.lazy` 做 code-split |
| 圖表 | Recharts | 雷達 + 長條；只在 dashboard 載入 |
| 拖拉 | @hello-pangea/dnd | 排序題用 |
| 語音 | Web Speech API | 僅 Chrome/Edge；其他瀏覽器自動隱藏 UI |
| 後端 | Node.js (≥18) + Express + TypeScript | |
| 資料庫 | SQLite (better-sqlite3 v11) | 同步 API、單一檔案、零安裝 |
| 認證 | JWT + bcrypt (rounds=12) | Token 7 天到期 |
| PDF | pdfkit | 學生報告 |
| QR Code | qrcode | 家長入口 |
| UUID | uuid v9 | mobile_linking_tokens |
| 後端單元測試 | vitest 4 | 17 個測試 |
| E2E 測試 | Playwright | 5 specs × 2 projects |
| 開發併發 | concurrently（根層依賴） | 一個指令同時啟動前後端 |
| TS 執行器 | tsx | 用於 scripts 與 dev 模式 |

---

### 系統架構

#### 後端分層

```
HTTP 請求
   ↓
[ routes/ ]              掛在 /api/{auth,quiz,admin}；authMiddleware 驗 JWT
   ↓
[ controllers/ ]         解析 req、驗欄位、格式化回應。不寫商業邏輯。
   ↓
[ services/ ]            商業邏輯，直接呼叫 getDb()，回傳純 JS 物件
   ↓
[ db/database.ts ]       單例 better-sqlite3 連線；WAL + foreign keys ON
```

**沒有 model / repository 層** —— service 自己掌握 SQL。詳見 `backend/src/models/README.md`。

#### 前端 Provider 順序

```
<BrowserRouter>
  <AuthProvider>          從 localStorage 讀 JWT、用 /api/auth/me 水合 user
    <ConfigProvider>      注音開關、字體大小、語言；useSenLayout() 推導 SEN
      <QuizProvider>      測驗狀態機（LOBBY → LOADING → QUIZ → SUBMITTING → RESULT）
        <Routes>          lazy-loaded pages
```

`useSenLayout()` 在「後端標 `user.is_sen_mode=1`」或「使用者手動把 fontSize 切到 'large'」任一條件下回 true——兩條路徑都通向同一套無障礙版型。

---

### 資料庫 Schema

`database/init.sql` 共 11 張表。重點欄位：

| 表 | 用途 | 重要欄位 |
|----|------|---------|
| `users` | 帳號 | `user_id`, `username`, `password_hash` (bcrypt 12), `role`, `class_id`, `total_exp`, `current_level`, `streak_days`, `is_sen_mode` |
| `questions` | 題庫 | `subject`, `theory_type` (4), `category_type` (8), `question_type`, `content` (JSON ZhuyinChar[]), `options` (JSON), `correct_answer`, `explanation` |
| `quiz_sessions` | 測驗回合 | `session_id`, `user_id`, `theory_type`, `total_score`, `is_passed`, `duration_seconds`, `pvp_mode`, `pvp_target_*` |
| `quiz_details` | 每題作答 | `session_id`, `question_id`, `user_answer`, `is_correct`, `speech_score`, `speech_text` |
| `praise_library` | 555 條讚美 | `scenario_type` (7 種含 `sen_encouragement`), `tone_type`, `content` |
| `user_praise_history` | 防重複紀錄 | 最近 20 條不再被選 |
| `user_stats` | 六維度快取 | `accuracy / stability / versatility / cognition / endurance / fluency` |
| `user_error_monsters` | 間隔重複狀態 | `streak_correct`, `next_review_time`, `status` |
| `user_items` | 獎勵倉庫 | 稱號、寵物造型 |
| `user_sprites` | 文法小精靈 | `current_form` (egg / baby / knight / god), 各主題 XP |
| `mobile_linking_tokens` | QR 家長入口 | UUID v4，一次性，5 分鐘到期 |

**所有 `theory_type` ∈** `{cognitive, input, usage, sociocultural}`。
**所有 `category_type` ∈** `{food_shopping, social, travel, business, health, leisure, housing, digital}`。

---

### API 參考

`/api/quiz/*` 與 `/api/admin/*` 路由全部需要 `Authorization: Bearer <jwt>`。

#### Auth

| Method | Path | Body | Returns |
|--------|------|------|---------|
| POST | `/api/auth/register` | `{username, password, display_name, grade}` | `201 {message, user_id}` |
| POST | `/api/auth/login` | `{username, password}` | `{token, user}`（user 含 level/streak/SEN flags） |
| GET | `/api/auth/me` | （只需 token） | `{user}`（完整檔案 + 六維度） |

#### Quiz

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/quiz/subjects` | 列出 active 科目 |
| GET | `/api/quiz/me/report` | 自己的學生報告 |
| POST | `/api/quiz/start` | `{theory_type, subject}` → 10 題（SEN 5 題），**無 `correct_answer`**，分層抽取自 8 類別 |
| POST | `/api/quiz/answer` | `{session_id, question_id, user_answer, speech_text?, speech_score?}` → `{is_correct, explanation}`，更新錯題怪獸狀態；語音相似度 ≥70% 答對 +5 XP |
| POST | `/api/quiz/finish` | `{session_id}` → 總分、升級 flag、讚美、streak_days、reward |
| GET | `/api/quiz/session/:id` | 完整 session（給 Result 頁 + PvP 比對用） |
| GET | `/api/quiz/monsters` | 到期錯題怪獸（≤ 20 個） |
| POST | `/api/quiz/monsters/review` | `{question_id, user_answer}` → 更新 SM-2 streak |
| GET | `/api/quiz/leaderboard` | 班級排行；非自己的名字隱碼為「首字＋同學」 |
| GET | `/api/quiz/pvp/classmates` | 同班同學列表 |
| POST | `/api/quiz/pvp/challenge` | 用過去 5 場通過記錄的中位數當目標 |

#### Admin（需 teacher 角色）

| Method | Path | 說明 |
|--------|------|------|
| GET | `/api/admin/dashboard` | 班級統計 + 本週測驗次數 |
| GET | `/api/admin/class/stats` | 學生統計 |
| GET | `/api/admin/student/:userId/report` | 單一學生完整報告（IDOR 守門） |
| GET | `/api/admin/student/:userId/pdf` | PDF 報告（PDFKit） |
| GET | `/api/admin/class/export/csv` | 班級 CSV 匯出 |
| POST | `/api/admin/student/:userId/qr` | 產生 5 分鐘 QR linking token 給家長 |

#### 通過門檻

```js
const maxScore = sum(question.score for question in quiz);
const passThreshold = Math.ceil(maxScore * 0.6);
const isPassed = totalScore >= passThreshold;
```

即一般模式（10 × 10 = 100，門檻 60）與 SEN 模式（5 × 10 = 50，門檻 30）需要**等比例**的精熟度，SEN 學童也能通過。

---

### 題目生成系統

中文題庫是「生成」出來的，不是手寫。

#### 檔案分布

- `scripts/questions/templates.ts` —— 32 個模板（4 主題 × 8 類別），每個模板宣告：
  - `data`：耦合欄位（如 `{word, right}`，確保「詞 → 正確語意」配對不錯位）
  - `vars`：獨立 cartesian 軸（如錯誤選項池）
  - `prompts`：3–4 種句型，依 row index 輪流使用
- `scripts/questions/matrix.ts` —— 把 `data` × `vars` 做笛卡兒積，並用 `rowIdx % prompts.length` 挑句型
- `scripts/questions/zhuyin.ts` —— 字符→注音對照；查不到的字注音空字串（與既有 seed 一致）

#### 抽題時的分層採樣

`quizService.getBucketsByCategory(subject, theory_type)` 把題目依 `category_type` 分桶並快取（5 分鐘 TTL）。`pickDiverseQuestions(buckets, count)` 從 8 個桶輪流挑——一般測驗的 10 題會橫跨全 8 類別、SEN 測驗的 5 題會橫跨 5 類別，從根源消除「10 題長一樣」的痛點。

#### 加更多題

```bash
# 編輯 template 的 data[]（如多加一筆 {word, right}）
$EDITOR scripts/questions/templates.ts

# 重 seed（INSERT OR IGNORE 不會重複）
npm run seed:questions
```

---

### SEN 模式設計

「SEN」（Special Educational Needs）—— 前端**只**叫「輕鬆學習模式」。

**後端調整**（`is_sen_mode = 1`）：

- 題數：10 → **5**（`quizService.startQuiz`）
- 讚美語：路由到 `sen_encouragement` 情境（52 條專屬）
- 通過門檻：縮放成 `60% of maxScore`，所以 SEN 50 分上限仍能在 30 分通過

**前端調整**（`useSenLayout() === true`）：

- 容器寬度：`max-w-2xl` → `quiz-board-sen`（更窄、單欄）
- 按鈕：`text-lg min-h-[56px]` → `answer-btn-sen` (`text-2xl py-6 min-h-[80px] rounded-3xl`)
- cool-down：1.2s → **1.8s**（防誤觸）
- 吉祥物：`BiBoFloatingSprite` 回傳 `null`（無干擾）
- 注音：24pt → 30pt、字距加寬
- 連勝火焰：拿掉跳動動畫
- 進度條文字：small → base

**硬性規定**：
- 「遲緩」、「特教」、「障礙」、「special needs」**絕對不能**出現在任何 UI
- 所有 SEN 條件分支統一由 `useSenLayout()` hook 推導，方便追蹤

---

### 多科目模組

科目 config 放在 `modules/<subject>/module.config.json`。

```json
{
  "subject": "math",
  "displayName": "數學",
  "displayNameI18n": { "zh-TW": "數學", "en": "Math", "ja": "算数", "ko": "수학" },
  "icon": "🔢",
  "color": "#3b82f6",
  "theoryTypes": ["cognitive", "input", "usage", "sociocultural"],
  "questionTypes": ["single_choice"],
  "gradeLevels": ["3", "4"],
  "isActive": true,
  "description": "..."
}
```

| 科目 | 狀態 | 種子腳本 |
|------|------|----------|
| `chinese` | active | `seed-questions` + `seed-questions-taiwan`（~1500 + 57） |
| `math` | active | `seed-math`（32 道手寫，臺灣情境） |
| `english` | stub（`isActive: false`） | 僅 placeholder config |
| `nature` | stub | 僅 placeholder config |
| `social` | stub | 僅 placeholder config |

所有科目共用同一個 `questions` 表（`subject` 欄區分）。前端用 `/api/quiz/subjects` 取得 active 科目清單。

加新科目流程見 `modules/MODULE_SPEC.md`。

---

### 測試

```bash
# 後端單元測試（vitest）
cd backend && npm test               # 17/17 個測試橫跨 4 個檔

# 端對端（Playwright）
npm run test:e2e                     # 5 specs × 2 projects = 10 tests

# AI 兒童測試員（Playwright 驅動）
npm run test:child                   # 1 場，4 種 persona 輪流
npm run test:child:batch             # 50 場，隨機 persona
```

#### Vitest 涵蓋

| 檔案 | 守住的行為 |
|------|------------|
| `quizService.test.ts` | SEN 使用者 → `sen_encouragement` 讚美池路由 |
| `errorMonsterService.test.ts` | SM-2-lite 創建／累進／淨化／隱藏未來題目 |
| `streakRewardService.test.ts` | 里程碑解鎖 + 冪等性 |
| `pvpService.test.ts` | 中位數目標 + 加權比較 |

#### Playwright 涵蓋

| Spec | 斷言 |
|------|------|
| 登入頁渲染 | RedMushroom logo + 帳號輸入框可見 |
| 用示範學生登入 | 10 秒內進到「今天要練習哪個主題？」 |
| 開始測驗流程 | 點主題後出現答題按鈕 |
| IDOR：無 token 取 session | 回 401 |
| `/api/quiz/start` payload | 任何題目都不含 `correct_answer` 欄位 |

#### AI 兒童測試員 personas

| Persona | 行為 | 應用 |
|---------|------|------|
| `careful` | 80% 選正確選項（1），20% 隨機 | 模擬認真學生 |
| `random` | 4 個選項均勻隨機 | 統計 baseline |
| `speedy` | 永遠選選項 1 | 最快走完流程 |
| `guesser` | 選文字最長那個 | 經驗法則 baseline |

每種 persona 有不同的 `thinkTime` 分布，模擬真實課堂節奏。

---

### 安全設計

- **IDOR**：所有涉及學生資料的 SQL 都帶 `WHERE user_id = ?`。JWT-decoded `req.user.user_id` 是唯一可信來源；request 參數需與其比對。
- **不洩漏 `correct_answer`**：`quizService.startQuiz()` 明確排除這欄位才回傳前端。Playwright 守住每題的 key 集合。
- **bcrypt 12 rounds** 密碼雜湊（筆電上約 300ms——慢到擋掉字典攻擊）。
- **JWT 7 天到期**；secret 從 `backend/.env` 讀取。
- **CORS**：開發模式只允許 `http://localhost:5173` / `:3000`；production 關閉。
- **QR 家長入口 token**：UUID v4、一次性、5 分鐘到期，使用後標 `expired`。
- **熱路徑禁用 `ORDER BY RANDOM()` 全表掃描**——改用記憶體快取（`quizService.getBucketsByCategory`，5 分鐘 TTL）+ Fisher-Yates。
- **SEN 標籤**不洩漏臨床術語到任何 UI（zh-TW / en / ja / ko 都清乾淨）。
- **TypeScript 禁用 `any`**——每個 API 邊界都有 interface。

完整規範見 `CLAUDE.md`；PR 會以此 review。

---

### 開發流程

```bash
# 首次設置
npm run setup

# 日常——啟動前後端（Ctrl+C 兩次關閉）
npm start

# Production build
npm run build
# → backend/dist/  +  frontend/dist/

# 後端測試
cd backend && npm test

# 前端 typecheck
cd frontend && npx tsc --noEmit

# E2E
npm run test:e2e

# 不洗使用者資料、只重 seed 題庫與讚美
# （所有 insert 都是 INSERT OR IGNORE）
npm run seed:questions
npm run seed:tw
npm run seed:math
npm run seed:praise

# 硬重 DB（會洗掉所有東西）
rm database/redmushroom.db
npm run setup
```

#### Hot reload

- 後端：`tsx watch src/index.ts`——存檔自動重啟
- 前端：`vite`——亞秒級 HMR

#### DB file handle 陷阱

後端開機時開啟 `database/redmushroom.db` 的 file handle。如果你在後端執行中對 DB 做 `rm` 後重建，後端會繼續寫到那個「已刪除但仍開啟」的 inode。**做完 `rm database/*` 後務必重啟後端**。

---

### 疑難排解

#### Windows 出現 `'concurrently' is not recognized`

幾乎 100% 是你從 **WSL／Linux** 在 NTFS 共用磁碟上跑了 `npm install`。WSL 的 npm 在 `node_modules/.bin/` 建立的是 Linux symlink；Windows CMD 需要 `.cmd` / `.ps1` shim。

**修法：**

```cmd
雙擊  reinstall.bat
```

會清掉 `root / backend / frontend` 三個 `node_modules` 並從 Windows 端重灌，shim 就會正確生成。

#### `better-sqlite3` 原生編譯失敗

原因：Node 版本太新還沒對應的 prebuild（例如 Node 25 出來時 `better-sqlite3 11.5` 尚未發佈對應版本）。

**修法 A（最快）**：改裝 Node 22 LTS，`npm install` 就會用 prebuild。

**修法 B（從原始碼編譯）**：裝 [Visual Studio Build Tools](https://aka.ms/vs/17/release/vs_BuildTools.exe) → C++ Desktop Development → 重灌依賴。

#### `mushroom-300` / `mushroom-400` CSS 報錯

你的 `tailwind.config.ts` 是舊版，缺這些色階。拉 `main`，現在的 config 已補齊 50–900 全色階。

#### Playwright 抱怨 dev server 已存在

```
Error: http://localhost:5173 is already used
```

你先手動啟動了服務再跑測試。要嘛 `pkill -f vite` 殺掉重來，要嘛確認 `playwright.config.ts` 的 `reuseExistingServer: !process.env.CI` 沒被 `CI=1` 蓋掉。

#### 示範學生 SEN 模式永遠不通過

舊版寫死 `>= 60` 通過門檻，但 SEN 上限只有 50 分，所以永遠不通過。最新版改成 `>= 60% of max`，SEN 在 30 分通過。如果你 fork 自 2026-05-21 之前，拉 `main`。

#### `npm run test:child` 立刻失敗

Playwright browser 還沒裝：

```bash
npx playwright install chromium
```

---

### 授權

MIT License —— 歡迎在台灣中小學免費使用與二次開發。商標「RedMushroom」／「紅蘑菇」保留給維護者的 SaaS；**商業 fork 須改名**。詳見 `docs/business/open-core-plan.md`。
