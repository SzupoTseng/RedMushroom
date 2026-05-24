# RedMushroom（紅蘑菇）🍄

> Digital Chinese & Math Learning System for Elementary School (Grades 3–4)
> Mandarin and Math practice for Taiwan elementary grades 3–4.

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
10. [Score & Reward System](#score--reward-system)
11. [Typing Game](#typing-game)
12. [Word Typing Game (PvZ-style)](#word-typing-game-pvz-style)
13. [Bopomofo Font System](#bopomofo-font-system)
14. [Reading Helper (Dictionary Side Panel)](#reading-helper-dictionary-side-panel)
15. [Reading Tool (Annotate an Article)](#reading-tool-annotate-an-article)
16. [Extension Modules (Printable Worksheets & Stroke Practice)](#extension-modules-printable-worksheets--stroke-practice)
17. [Student Name & Belonging System](#student-name--belonging-system)
18. [Quiz Transition Effects](#quiz-transition-effects)
19. [SEN Mode Design](#sen-mode-design)
20. [Multi-Subject Modules](#multi-subject-modules)
21. [Testing](#testing)
22. [Security](#security)
23. [Development Workflow](#development-workflow)
24. [Troubleshooting](#troubleshooting)
25. [License](#license)

---

### Features

#### Quiz modes
- 🧠 **4 Learning Theories**: Cognitive, Input, Usage, Sociocultural — single-theory focus.
- 🎯 **Mixed Mode**: One 10-question quiz pulls 2–3 from each theory, stratified across all 8 categories. Most diverse practice.
- ✂️ **Sorting-only Mode**: 10 drag-to-arrange questions drawn from all categories (`question_type = 'sorting'`). Tiles spawn in randomised order so the student actually has to drag.
- 📚 **~1,920+ Chinese + 32 Math Questions**: 32-template matrix (4 theory × 8 category × prompt variants) + 57 Taiwan-localised seeds + 32 math problems in Taiwan contexts (NTD, ping, YouBike, NHI) + 85 supplementary questions on measure words, antonyms, synonyms, seasons, animals, time expressions, and sentence patterns.

#### Anti-repetition / quality
- 🎲 **Stratified Sampling + 6h No-Repeat**: Round-robins all 8 life-context categories; skips any question the same user saw OR answered in the last 6 hours.
- 🛡️ **Content-fingerprint Deduplication**: Even if two `question_id`s have identical options + correct_answer (e.g. only the actor name differs), only one is shown per quiz — refills from a structurally different question in the same category.
- 🔀 **Shuffled Answer Positions**: Each question's correct answer is shuffled into one of 4 slots at seed time. Distribution roughly 25% / 25% / 25% / 25%.
- 🔄 **Drag-tile Shuffle**: Sorting questions display tiles in random order (not the answer order).
- 🎨 **Multiple Prompt Phrasings**: Each cognitive template rotates through 4 question wordings; sorting through 3.
- 🧹 **Disputed-question Audit**: 3 sorting templates that produced ambiguous orderings (where two arrangements both read naturally in Mandarin) were redesigned, and 196 existing ambiguous rows were removed from the DB.

#### Typing games
- 🎮 **Character Typing Game**: 100 levels of falling characters; type the bopomofo to vaporise each one.
- 🍄 **Word Typing Game (PvZ-style)**: dinosaur slowly closes in from the right while words float in; correct typed word fires a mushroom seed that hits the word AND pushes the dinosaur back. 100 levels × 2-minute timer each. Vocabulary = 1,000 most common 2-character compounds derived locally from our MIT-licensed dictionary.
- 💚 **IME-compatible**: uses `compositionupdate` + `compositionend` so users can type with the Chinese IME on. No need to disable input method.
- ✏️ **Real-time bopomofo display**: shows the bopomofo being composed.

#### Scoring & rewards (two-currency system)
- 📊 **EXP (`total_exp`)**: grows from quizzes and games; never decreases. Drives the level system.
- 🎁 **Reward Points (`reward_points`)**: a separate spendable currency, earned alongside EXP. Reserved for the planned reward shop where redemption deducts from this balance only.
- 🆙 **Level thresholds double per level**: Lv1→2 = 5,000 EXP, Lv2→3 = 10,000, Lv3→4 = 20,000, … (`5000 × 2^(lv-1)`).
- 💯 **1:1 score → EXP**: 80 in a quiz → +80 EXP; +10 bonus if you pass; typing games credit per character or per word.
- 🏠 **Home page score card**: Lv, progress bar, total EXP, reward points, streak fire — all auto-refresh after each game.
- ❌ **Mid-quiz exit = no score** (the unified back-button discards the in-progress session).

#### Other gameplay
- 🐲 **Error Monsters**: SM-2-lite spaced repetition (**1h** / 24h / 72h / 168h / 336h; 3 consecutive corrects purifies). Newly-trapped monsters surface within an hour; UI marks them as due (green pill) or waiting (yellow pill).
- ⚔️ **Async PvP Arena**: Challenge the median of your own past 5 sessions.
- 🏆 **Class Leaderboard**: Names privacy-masked to first-character + a suffix.
- 🎤 **Speech Bonus XP**: Web Speech API (zh-TW); +5 XP for ≥70% Dice-bigram similarity.
- 📊 **6-Dimension Radar**: Accuracy, Stability, Breadth, Cognitive, Endurance, Fluency.
- 🔁 **Inline Wrong-answer Retry**: After a quiz, each wrong question gets a retry button that opens a side panel — answer again with no score impact. Works for both single-choice and sorting questions.

#### Reading & vocabulary tools
- 📖 **Reading Helper**: Select any Chinese text anywhere in the app — a side panel slides in showing every bopomofo reading (polyphonic chars list all variants) plus the dictionary definition. Backed by a 44,000-word MIT-licensed dictionary loaded into memory.
- 📖 **Reading Tool**: Paste any article, click Start, and every character gets its primary bopomofo annotation. Polyphonic characters are highlighted yellow; click one to pick a reading from a bottom strip showing the same character with each reading variant.
- 🖋 **Stroke Practice**: Type any characters; each becomes an animated Hanzi Writer card with playback, trace-quiz, and reset. Powered by `hanzi-writer` (MIT) + Make-Me-A-Hanzi data via CDN.

#### Extension modules (printable worksheets)
- 📝 **Math Practice Generator**: Pure procedural addition/subtraction/multiplication/division with configurable range, count, and multi-operand chains. Print-friendly (CSS @media print hides controls).
- ✍️ **Tianzige Writing Grid**: CSS-rendered 4-square or 9-square grids with optional sample fill and faded tracing rows. No stroke-data dependency.
- 📋 **Print Worksheet**: Pulls a random sample from the local question bank into a printable worksheet with name/class/date/score header. Teacher-version toggle reveals answers.

#### Accessibility & UI
- 🌟 **SEN-Friendly Mode**: "Easy Learning Mode" — 5 questions, larger fonts, single-column, 1.8s anti-mistap cooldown, dedicated 50+ praise lines, mascot hides. Never uses clinical terms.
- ✍️ **Bopomofo Font System**: 8 bundled bopomofo fonts (Huninn, Iansui, ZihiKai, GenYoGothic, GenSenRounded, ZihiSerif, HanWang Kai, HanWang Ming polyphonic) plus the traditional ruby tag mode. User-selectable, persisted in `localStorage`. Default: ZihiKai (closest to a school textbook).
- 🎴 **Vertical Bopomofo Layout**: A reusable `BopomofoColumn` component lays out the bopomofo with the syllable initials/medials/finals stacked vertically and the tone mark to the right — matching Taiwan textbook convention. Used in the reading panel, reading tool, dictionary pills, and the dictionary cards in the per-character readings table.
- ✨ **Quiz Transition Effects**: Between questions, a splash card with the upcoming question number animates in; the new question card slides in from the right. Designed so the student visibly knows the question changed (replaces an earlier silent snap).
- ← **Unified back button**: Every page and game has a consistent back button (mid-game button discards the session).

#### Student name & belonging system
- 👋 **Editable Chinese name on the home page**: A prominent welcome card shows the student's display name; click to edit inline (1–12 chars, validated server-side).
- 💬 **Personalised feedback**: In the quiz, the header reads "{name} keep going!" and after each answer the screen flashes "{name}, correct!" or "{name}, try again" — the name shows up everywhere to reinforce identity and ownership.

#### Content & community
- 💬 **555-line Praise Library**: 503 general + 52 SEN-specialty; last 20 excluded from the next pick.
- 📱 **QR Code Parent Portal**: 5-minute one-time token (UUID v4) — no cloud account.
- 👩‍🏫 **Teacher Dashboard**: Class overview, PDF reports, CSV export.
- 🌐 **Multi-language UI**: zh-TW / English / Japanese / Korean.
- 🐹 **AI Child Tester**: Built-in 4-persona Playwright simulator for UX stress testing.
- 📦 **Code-split frontend**: Initial JS bundle 170KB (gzip 55KB); the 7.8 MB dictionary and 1,000-word vocabulary are lazy-loaded only when their feature is opened.

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
npm run seed:questions   # ~1000 Chinese questions from 32 templates
npm run seed:tw          # 57 Taiwan-localised Chinese questions
npm run seed:math        # 32 math questions (4 theory × 8 category)
npm run seed:praise      # 555 praise lines (general + SEN)
```

#### When something breaks

- **`Run.bat` shows "concurrently is not recognized"** → you ran `npm install` from WSL on the shared NTFS partition. Linux symlinks instead of Windows `.cmd` shims. **Fix:** double-click `reinstall.bat` (wipes & reinstalls all 4 `node_modules` layers — root / backend / frontend / scripts — using Windows-native npm).
- **DB needs regeneration after a code change** → `Run.bat` checks for `database/.db-version` (a small marker file written by `setup.mjs`). Delete `database/redmushroom.db` and `database/.db-version`, then double-click `Run.bat` — it auto-runs setup.
- **`better-sqlite3` native compile fails** → Node version (e.g. 25) is too new for the bundled prebuilds. Downgrade to Node 22 LTS, OR install Visual Studio Build Tools so it can compile from source.

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
│   ├── public/
│   │   └── fonts/                  # 8 bopomofo TrueType fonts (66 MB total, lazy-loaded)
│   ├── src/
│   │   ├── App.tsx                 # Lazy-loaded routes + Suspense
│   │   ├── pages/                  # 11 page-level components incl. TypingGame
│   │   ├── components/             # quiz/, common/ (ZhuyinText, BpmfFontSelector …)
│   │   ├── context/                # AuthContext, QuizContext, ConfigContext (bpmfFont)
│   │   ├── hooks/                  # useSpeechRecognition
│   │   ├── i18n/                   # 4 locales
│   │   └── types/                  # Shared TS types (User has reward_points)
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
│   ├── init.sql                    # 11-table schema + indexes (UNIQUE on quiz_details)
│   ├── upgrade_schema.sql          # Migrations: v2 UNIQUE index, v3 reward_points column
│   ├── .db-version                 # Marker file ('shuffle-v1'); Run.bat checks this
│   └── redmushroom.db              # generated, gitignored
│
├── fonts/                          # Source bopomofo fonts (deduped from public/)
│
├── scripts/
│   ├── setup.mjs                   # Cross-platform installer; writes .db-version
│   ├── init-db.ts                  # Apply init.sql
│   ├── seed-minimal.ts             # 10 demo questions + 12 praises + 2 users
│   ├── generate-questions.ts       # Build Chinese matrix from templates
│   ├── seed-questions-taiwan.ts    # 57 Taiwan-localised Chinese questions
│   ├── seed-math.ts                # 32 math questions
│   ├── seed-praise-library.ts      # 555 praise lines
│   ├── check-db-fresh.js           # Optional CJS DB-fresh check
│   ├── python_setup.py             # WSL-safe DB rebuild (uses Python sqlite3 + bcrypt)
│   ├── questions/                  # Template definitions for matrix
│   │   ├── templates.ts            # 32 Chinese templates + 4-variant prompts + shared MEANING_PROMPTS
│   │   ├── matrix.ts               # Row builder + prompt rotation
│   │   ├── shuffle.ts              # shuffleSingleChoice() — answer-position shuffler
│   │   └── zhuyin.ts               # bopomofo char → pinyin lookup
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
| `users` | Accounts | `user_id`, `username`, `password_hash` (bcrypt 12), `role`, `class_id`, `total_exp` (EXP), **`reward_points`** (spendable currency, v3 migration), `current_level`, `streak_days`, `is_sen_mode` |
| `questions` | Question bank | `subject`, `theory_type` (4 enum), `category_type` (8 enum), `question_type` (single_choice / sorting), `content` (JSON ZhuyinChar[]), `options` (JSON), `correct_answer`, `explanation` |
| `quiz_sessions` | Quiz runs | `session_id`, `user_id`, `theory_type`, `total_score`, `is_passed`, `duration_seconds`, `pvp_mode`, `pvp_target_score`, `pvp_target_secs` |
| `quiz_details` | Per-answer log | `session_id`, `question_id`, `user_answer`, `is_correct`, `speech_score`, `speech_text`. **UNIQUE(session_id, question_id)** (v2 migration) — allows `INSERT OR IGNORE` placeholder rows at startQuiz, `UPDATE`d at submitAnswer. |
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
| POST | `/api/quiz/start` | `{theory_type, subject}` — `theory_type` accepts `cognitive` / `input` / `usage` / `sociocultural` / `mixed` / `sorting`. Returns 10 (or 5 for SEN) questions **without `correct_answer`**, stratified across 8 categories, 6h-no-repeat filtered, content-fingerprint deduplicated. Pre-inserts placeholder rows into `quiz_details` so abandoned quizzes still count for the no-repeat window. |
| POST | `/api/quiz/answer` | `{session_id, question_id, user_answer, speech_text?, speech_score?}` → `{is_correct, explanation}`. Updates the pre-inserted placeholder row via UPDATE. Updates error-monster state; +5 XP if speech ≥ 70%. |
| POST | `/api/quiz/finish` | `{session_id}` → final score, level-up flag, praise, streak_days, reward (or null). Grants both `total_exp` and `reward_points` (same amount). |
| GET | `/api/quiz/session/:id` | Full session with all answers, including `correct_answer` and `explanation` (for Result page retry panel + PvP comparison). |
| GET | `/api/quiz/monsters` | All active error monsters (≤ 20), each with `is_due: boolean`. Due ones come first. |
| POST | `/api/quiz/monsters/review` | `{question_id, user_answer}` → updates SM-2 streak |
| GET | `/api/quiz/leaderboard` | Class ranking; non-self names masked to first-character + suffix |
| GET | `/api/quiz/pvp/classmates` | Same class peers (no full names exposed) |
| POST | `/api/quiz/pvp/challenge` | Creates a session with target = median(last 5 wins) |
| **POST** | `/api/quiz/game-score` | **NEW**: `{exp, reward, source}` → adds `exp` to `total_exp` and `reward` to `reward_points`, recomputes level. Validates `0 ≤ exp,reward ≤ 9999`. Called by the typing game (1 EXP + 3 reward points per character destroyed). |
| **GET** | `/api/quiz/vocab` | **NEW**: Returns up to 120 unique CJK character + bopomofo pairs extracted from question content, shuffled. Used by the typing game for curriculum-grounded vocabulary. |

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
- `scripts/questions/zhuyin.ts` — Char → bopomofo lookup; unknown chars get empty pinyin (acceptable).

#### Stratified Sampling + 6h No-Repeat at Quiz Time

`quizService.getBucketsByCategory(subject, theory_type)` caches questions grouped by `category_type` (5-min TTL). `pickDiverseQuestions(buckets, count)` round-robins picks across all 8 buckets, so a normal quiz spans 8 categories and a SEN quiz spans 5 — eliminating the "all 10 questions feel the same" problem.

On top of that, `getRecentlySeenIds(userId, hours=6)` returns the set of distinct `question_id`s the user has answered in the last 6 hours (joined `quiz_details` ↔ `quiz_sessions`). The buckets are filtered by this set before sampling. If the filtered pool falls below the required count (e.g. a brand-new theory with very few questions), it falls back to the full bucket so the user never sees an "insufficient question pool" error.

This means: **back-to-back quizzes by the same student show genuinely different questions** until at least 6 hours have passed.

#### Adding More Questions

```bash
# Edit a template's data[] (e.g. add a new word + meaning row)
$EDITOR scripts/questions/templates.ts

# Regenerate (idempotent: INSERT OR IGNORE)
npm run seed:questions
```

---

### Score & Reward System

Two independent currencies, both incremented at the same time but with different roles:

| Currency | Column | Purpose | Decreases? |
|----------|--------|---------|------------|
| **EXP** | `users.total_exp` | Drives the level system (used for level display + progress bar). | Never |
| **Reward Points** | `users.reward_points` | Spendable currency for the planned reward shop. | Yes, when redeemed |

#### Earning formulae

| Source | EXP gained | reward_points gained |
|--------|-----------|---------------------|
| Quiz answered (all 10 questions, regardless of pass) | `total_score` (1:1) | same as EXP |
| Quiz **passed** (score ≥ 60% of max) | +10 pass bonus | same as EXP |
| Speech bonus (≥ 70% similarity AND answer correct) | +5 | (not granted) |
| Typing game (per character destroyed) | +1 | +3 |
| Mid-quiz exit (back button) | **0** | **0** |

#### Level thresholds (doubling)

```
Lv 1→2 :  5,000 EXP
Lv 2→3 : 10,000 EXP
Lv 3→4 : 20,000 EXP
Lv 4→5 : 40,000 EXP
Lv N→N+1 : 5000 × 2^(N-1) EXP
```

Same formula used both server-side (`quizService.updateExp`, `/api/quiz/game-score`) and client-side (`SubjectSelector` → `expToLevel`).

#### Score persistence + refresh

- After every quiz `finishQuiz` or typing-game character, the backend updates `users.total_exp / reward_points / current_level` directly.
- `AuthContext.refreshUser()` re-fetches `/api/auth/me` so the home page shows the latest.
- `SubjectSelector` calls `refreshUser()` on every mount; `Result` also calls it before rendering the score modal. **This fixes a previous "score-not-saved" bug** caused by displaying stale login-time cache.

#### Mid-game exit

Every game (quiz / sorting / mixed / typing) has a unified back button. Clicking it calls `resetQuiz()` (or just `navigate('/')` for the typing game) and **discards the in-progress session** — no `finishQuiz` is called, so neither EXP nor reward_points are awarded. `quiz_details` placeholder rows still exist (so the 6h no-repeat window covers what was seen).

---

### Typing Game

`/typing-game` — a 100-level falling-character bopomofo typing challenge.

#### Level zones

| Levels | Speed | Rotation | Target chars to clear | Spawn interval |
|--------|-------|----------|----------------------|----------------|
| 1–10 | `0.030` (slow) | None | `lv + 4` (5→14) | 3.6s → 1.8s |
| 11–50 | `0.036` (slow × 1.2) | None | `lv` (11→50) | 1.8s → 1.2s |
| 51–100 | `0.039` (slow × 1.3) | Slow rotation 0.3 → 1.8 deg/frame, random ±direction | `lv` (51→100) | 1.2s → 0.8s |

#### Input handling (IME-friendly)

Listens to **`compositionupdate`** + **`compositionend`** events on a focused `<input>`. Because the Chinese IME is left enabled:

- `compositionupdate.data` → contains the **current bopomofo being typed** (e.g. "ㄏㄠˇ"). Shown live in the input strip at the bottom of the screen.
- `compositionend.data` → contains the **confirmed Chinese character** the IME just committed. Matched against falling characters by **character**, not by bopomofo, so polyphonic chars work naturally.

Falling chars are matched by Chinese character; on match the cannon fires (shoot animation + +1 EXP +3 reward_points POSTed to `/api/quiz/game-score`).

#### Vocabulary source

`GET /api/quiz/vocab` returns up to 120 unique CJK chars + their bopomofo, extracted from `questions.content` (which stores `ZhuyinChar[]` JSON). Falls back to a 28-character hardcoded list if the API is unreachable (no token, network error).

#### UI signals

- **3 mushroom lives** 🍄🍄🍄 in HUD; reaching the ground = lose one.
- **Score** in the top center.
- **Level progress bar** with `cleared / target`.
- **Combo flash** ("Combo x3! +20") above the cannon.
- **Wrong-flash** (red bar) at the bottom when a wrong character is typed.
- **🎁** Win screen at level 100.
- **Back** button in top right.

#### Score saving

Each character destroyed POSTs `{ exp: 1, reward: 3, source: 'typing-game' }` to `/api/quiz/game-score`. The backend grants both. Mid-game exit keeps all accumulated points (per-character grants are immediate, not deferred).

---

### Word Typing Game (PvZ-style)

A second typing game built around words (2-character compounds) instead of single characters, themed as mushroom vs. dinosaur.

#### Layout

- Mushroom 🍄 fixed at the left edge (the player).
- Dinosaur 🦖 starts at ~88% and creeps left over the level — with a CSS keyframe bobbing animation so it looks like it's running.
- Words float in from the right edge and drift left.
- Bottom input bar: type a word and press Enter to fire.

#### Mechanics

- 100 levels × 2-minute timer.
- Active words on screen: `min(8, level × 2)` — Lv 1 = 2, Lv 3 = 6, Lv 5+ = 8. Spawn loop maintains this fill level instead of dripping a fixed total.
- Per-level win condition: clear `min(40, level × 2)` words before time runs out and before the dinosaur reaches you.
- Dinosaur speed: `0.8 + (level − 1) × 0.04` %/sec (Lv 1 ~100s to reach, Lv 100 ~17s).
- Word leftward speed: `1.0 + (level − 1) × 0.04` %/sec.
- A correct match fires a seed bullet, removes the word, and knocks the dinosaur back by `3 + word.length` percentage points.
- 3 mushroom hearts. A word touching the player drops one heart. Lose when 0 hearts OR dinosaur reaches the player OR time expires.
- Combo counter: every consecutive hit increments it; the combo flash appears at ≥3.

#### Input behavior

- Pressing Enter is the ONLY trigger for matching. Auto-matching on each composition was removed because it triggered prematurely and could match a partial word.
- Correct → fires the seed and clears the input.
- Wrong → input shakes red briefly and is preserved so the player can edit and retry.
- Between-level overlays: Enter advances to next level / retries / starts. Escape returns home. The input also receives focus automatically once `phase === 'playing'`.

#### Visual feedback

- **Partial match highlight**: while the player types, words whose value starts with the typed prefix are highlighted yellow and scaled up; non-matching words dim. This eliminates "did I type the right one?" anxiety.
- **Floating +EXP popup**: each successful match emits a small text bubble from the word's position that floats upward and fades.
- **Combo flash**: at combo ≥ 3, a large center-stage label briefly pops in.
- **Danger zone**: when the dinosaur crosses the 28% mark, the play area gains a faint pulsing red overlay.
- **Looming dinosaur**: the dinosaur's `font-size` scales with proximity (3rem far → 5rem close) for visceral pressure.

#### Vocabulary

1,000 most common 2-character compounds. Generated locally from `backend/data/dictionary.json` (MIT-licensed source) by filtering to 2-char words whose individual characters appear in at least 8 compound entries, sorted by aggregate frequency, capped to 1,000. The output is `frontend/public/data/common-words.json` (~48 KB). Regenerate any time with `python3 scripts/build_word_vocab.py`.

#### Score saving

Each correct word POSTs `{ exp: 5 + word.length × 2, reward: half of exp, source: 'word-typing-lv${level}' }` to `/api/quiz/game-score`. Level pass bonus: `10 + level × 2` EXP.

---

### Bopomofo Font System

The system can render bopomofo annotation in two modes:

#### Mode A: `<ruby>/<rt>` annotation (traditional)

```html
<ruby>{Han char}<rt>{bopomofo}</rt></ruby>
```

Bopomofo characters are rendered ABOVE the Chinese character via HTML `<ruby>` semantic markup. Works in any font. The default fallback.

#### Mode B: Bopomofo-embedded font

Apply a special font where the bopomofo annotation is part of the glyph itself:

```css
.bpmf-font {
  font-family: var(--bpmf-font-family), 'Noto Sans TC', sans-serif;
  line-height: 1.8;
}
```

The font draws the bopomofo NEXT TO the Chinese character automatically. No `<ruby>` markup needed.

#### Bundled fonts (in `frontend/public/fonts/`)

8 bopomofo-annotated fonts are bundled. Bopomofo glyphs are embedded next to each Chinese character via OpenType character variants, so **no `<ruby>` markup is required**.

Sources:
- **Bpmf\*** family from [ButTaiwan / Bopomofo Variants Set (bpmfvs)](https://github.com/ButTaiwan/bpmfvs) — **Apache License 2.0**
- **HanWang\*** family from the Han Wang professor's Chinese fonts — freely distributed with attribution

| Font family identifier | Source project | Style | Size | Best for |
|-------------|--------|-------|------|----------|
| **`BpmfZihiKai`** (default) | ButTaiwan/bpmfvs | Educational kai (MOE standard) | 17 MB | Textbook style |
| `HanWangKaiAnnotated` | Han Wang free-license set | Traditional kai | 14 MB | Alt-kai for comparison |
| `BpmfHuninn` | ButTaiwan/bpmfvs | Modern round sans (Huninn) | 4.4 MB | UI, screens |
| `BpmfGenSenRounded` | ButTaiwan/bpmfvs | Rounded | 7.4 MB | Friendly, lower grades |
| `BpmfGenYoGothic` | ButTaiwan/bpmfvs | Gothic / sans (Source Han Sans) | 5.2 MB | High readability |
| `BpmfZihiSerif` | ButTaiwan/bpmfvs | Serif / Mincho | 6.5 MB | Print-book style |
| `BpmfIansui` | ButTaiwan/iansui | Handwriting | 7.1 MB | Casual, friendly |
| `HanWangMingPolyphonic1` | Han Wang free-license set | Serif with polyphonic readings | 3.3 MB | Teaching multi-pronunciation characters |

The `unicode-range` rule plus `font-display: swap` means each font is only downloaded when actually selected — adding fonts to the dropdown does **not** inflate the initial JS bundle.

License files for each font (`LICENSE-2.0.txt`, `NOTICE.txt`, etc.) are kept alongside the source TTFs in `fonts/<family>/`.

#### Configuration

- Selector dropdown on the home page header (next to the language switcher)
- Choice persisted in `localStorage['rm_bpmf_font']`
- Default: `BpmfZihiKai` (closest to grade-school textbook style)
- Sets CSS variable `--bpmf-font-family` on `<html>` — every `.bpmf-font` element updates instantly
- The "no font (ruby annotation)" option reverts to `<ruby>/<rt>` mode

#### Applied to

- `<ZhuyinText>` component (auto-switches between modes)
- Quiz question prompts (`QuizBoard`)
- Quiz answer-option labels (single-choice + sorting tiles)
- Error monster review questions + options
- Result page retry panel
- Typing game falling characters (the small bopomofo capsule is hidden when font mode is active)

---

### Reading Helper (Dictionary Side Panel)

When the student **selects (highlights) any Chinese text** anywhere in the app, a 320 px panel slides in on the right showing:

- The matched word (or longest-prefix match / first-char fallback)
- **All bopomofo readings** — polyphonic characters list every reading (e.g. one common conjunction character has 5 readings: ㄏㄜˊ / ㄏㄜˋ / ㄏㄢˋ / ㄏㄨˊ / ˙ㄏㄨㄛ — the bopomofo symbols themselves are not Han characters so they remain)
- The MOE-style definition, numbered + example phrases
- Per-character readings when the whole phrase isn't in the dictionary

#### Data source

Ported from the [ToneOZ](https://toneoz.com) Mandarin dictionary (MIT-licensed). The original 268-shard tzdata is merged into a single `backend/data/dictionary.json` (43,986 words / 44,710 entries, 7.8 MB).

| Layer | Path | Notes |
|------|------|-------|
| Importer | `scripts/import_dict.py` | Parses `window.tzdic["N"] = {...}` shards, merges, normalises `<br>` → newlines. Re-run when source dictionary updates. |
| In-memory cache | `backend/src/services/dictService.ts` | Loaded once on first lookup; ~30 MB heap; O(1) `Map` access. |
| Backend route | `GET /api/dict/lookup?q=<text>` | No auth — public reference data. 50-char cap. |
| Frontend component | `frontend/src/components/common/ReadingHelper.tsx` | Document-level `selectionchange` + `mouseup` listener, 200 ms debounce, single mount in `App.tsx`. |

#### Lookup strategy

1. **Exact match** — `dict[query]`
2. **Longest prefix** — drop trailing chars until a match is found (≥ 2 chars)
3. **First char fallback** — always return readings for the first char if known
4. **Per-char breakdown** — also returned for non-exact matches so the panel can show each character's readings even when the phrase isn't in the dict

#### When the panel appears / hides

- Trigger: text selection that **contains a Chinese character**, length ≤ 40, not inside an `<input>`/`<textarea>`/`contenteditable`
- Selections **inside the panel itself** are ignored (so highlighting the definition to copy doesn't re-fetch)
- Close button (×) hides until next selection; selecting different text re-opens

---

### Reading Tool (Annotate an Article)

A standalone page at `/reading-tool` that takes a pasted article and annotates every character with bopomofo, highlights polyphonic characters, and lets the student pick the correct reading for each one.

#### Layout

```
+--------- char block + char block + ... ---------+    +-------+
| Han_char + bopomofo column (right side)         |    | Dict  |
| ... punctuation passes through unchanged ...    |    | panel |
+-------------------------------------------------+    +-------+
        [◄]  "<char>" readings:  [char + reading 1] [char + reading 2] ...  [►]
```

#### Behavior

- Type or paste any text → click Start.
- Each Chinese character renders as a `char-block`: the character with a vertical bopomofo column to the right (and the tone mark in its own right-side track — matching textbook convention).
- Characters with ≥ 2 readings get a yellow background (polyphonic markers).
- Click any character → opens the bottom strip with one button per reading (each button shows the same character with each possible bopomofo). Click a reading → marks that occurrence as user-selected (green background).
- Side panel auto-populates with the dictionary entry for the longest-matching word starting at the click position.
- Prev/Next arrows (◄ ►) jump to the previous/next polyphonic character in the article.

#### Data sources

- `GET /api/dict/charmap` returns `{ char: [reading1, reading2, ...] }` for all single-character entries in the dictionary (~6,000 chars).
- `GET /api/dict/polyphonic` returns the subset with ≥ 2 readings (~552 chars).
- `GET /api/dict/lookup?q=<text>` for per-word dictionary cards.

#### Inspiration & licensing

The concept of an article annotator is widely available. Our implementation is a clean-room rewrite — no code, data, or assets were copied from any third-party tool. The bopomofo dictionary data and Hanzi Writer stroke data are both MIT-licensed sources (Bopomofo Variant Set and Make-Me-A-Hanzi respectively).

---

### Extension Modules (Printable Worksheets & Stroke Practice)

A row of optional tiles on the home page that open extra learning utilities. All clean-room implementations; no copied code or data.

#### Math Practice Generator (`/ext/math`)

- Pure procedural generation of `+`, `−`, `×`, `÷` problems.
- Configurable: operations (multi-select), preset difficulty (1–10, 1–20, 1–50, 1–100) or custom min–max range, problem count, number of operands (2–4 for chain problems), optional teacher version with answers shown.
- Subtraction enforces non-negative results; division enforces integer results; multiplication caps the operand range to keep results readable.
- Print-friendly: a CSS media query hides the setup panel and renders the worksheet with a name/class/date/score header.

#### Tianzige Writing Grid (`/ext/writing-grid`)

- Generates printable Chinese character practice paper.
- Choose grid type (4-square or 9-square), cells per character (2–15), demo mode (first cell shown / all cells shown for tracing / all blank), and optional faded tracing rows.
- Characters render in the user's selected bopomofo font (so the bopomofo annotation is already attached).
- 100% CSS-rendered grid lines; no stroke-data dependency.

#### Print Worksheet (`/ext/worksheet`)

- Backend endpoint: `GET /api/quiz/worksheet?subject=chinese&theory=<theory>&count=<n>`.
- Pulls a random sample of single-choice questions from the local question bank.
- Renders a printable worksheet with name/class/date/score header.
- Student version (blank options) or parent version (correct answer highlighted).
- All data sourced from our own seeded questions; no external content.

#### Stroke Practice (`/ext/stroke`)

- Type characters → each gets a Hanzi Writer card with playback, trace-quiz, and reset.
- Powered by [`hanzi-writer`](https://hanziwriter.org/) (MIT) and Make-Me-A-Hanzi stroke data via jsdelivr CDN.
- Configurable animation speed, stroke width, and outline visibility.
- Characters without stroke data (rare CJK extensions) show a friendly placeholder.

---

### Student Name & Belonging System

To increase a student's sense of ownership, the app surfaces their display name in three places.

#### Home page

A prominent welcome card at the top of `SubjectSelector` shows the student's name as a large heading. Click the card to switch into an inline edit field (1–12 characters, validated server-side).

#### Quiz HUD

The progress bar in `QuizBoard` reads "Question N / M  ·  {name} keep going!" so the student sees their name on every question.

#### Personalised answer feedback

After each answer, a center-stage card briefly appears:
- Correct → "{name}, correct!"
- Wrong → "{name}, try again"

The card animates in with the existing `combo-flash` keyframe and disappears just before the next-question transition takes over.

#### Backend

`PATCH /api/auth/me` accepts `{ display_name }`. Validation: 1–12 chars, only Chinese / Latin alphanumeric / spaces. Stored in the existing `users.display_name` column. `AuthContext` exposes an `updateDisplayName(name)` method that performs the patch and locally reflects the change so the new name appears across all open routes immediately.

---

### Quiz Transition Effects

When a question changes, the transition is no longer a silent snap. Three pieces of feedback fire in sequence so the student visibly knows the question changed:

1. **Dwell** (900 ms normal / 1400 ms SEN) — the answer-button colour stays so the student processes correct/wrong feedback.
2. **Splash overlay** (700 ms) — a center-stage card animates in with a mushroom emoji and the upcoming question number. The number is snapshotted at splash start to avoid jumping when React re-renders mid-transition.
3. **Slide-in card** (380 ms) — the new question card mounts with a CSS keyframe that fades in and slides from the right.

Implementation notes:
- The card animation uses `animation-fill-mode: backwards` so the final `transform` is NOT retained. Retained `transform: translateX(0)` would still create a containing block for fixed-positioned descendants, which would break `@hello-pangea/dnd` for sorting questions (the dragged tile would drift off-axis).
- The `animate-pop` on `ScoreModal` is similarly scoped to the score-card column only, so the retry panel's sorting questions are never inside a transformed ancestor.

---

### SEN Mode Design

"SEN" (Special Educational Needs) — referred to **only** as "Easy Learning Mode" in the UI (never as SEN or any clinical term).

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
- Words equivalent to "delayed" / "special education" / "disability" / "special needs" — in any language — must never appear in any UI surface.
- All SEN code paths are behind a single hook `useSenLayout()` for traceability.

---

### Multi-Subject Modules

Subject modules live in `modules/<subject>/module.config.json`.

```json
{
  "subject": "math",
  "displayName": "Math",
  "displayNameI18n": {
    "zh-TW": "<Traditional Chinese name>",
    "en": "Math",
    "ja": "<Japanese name>",
    "ko": "<Korean name>"
  },
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
| Login with demo student | Lands on the theory-selection screen within 10s |
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

MIT License — free for use and adaptation in schools worldwide. The "RedMushroom" name and logo are reserved for the maintainer's hosted SaaS; **forks must rebrand** if commercialised. See `docs/business/open-core-plan.md`.

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
10. [分數與獎勵系統](#分數與獎勵系統)
11. [打字遊戲](#打字遊戲)
12. [語詞快打（蘑菇對恐龍）](#語詞快打蘑菇對恐龍)
13. [注音字型系統](#注音字型系統)
14. [選字讀音助手](#選字讀音助手)
15. [讀音工具（貼文章標注音）](#讀音工具貼文章標注音)
16. [擴充模組（學習單列印＋筆順練習）](#擴充模組學習單列印筆順練習)
17. [學生姓名與歸屬感系統](#學生姓名與歸屬感系統)
18. [題目切換轉場](#題目切換轉場)
19. [SEN 模式設計](#sen-模式設計)
20. [多科目模組](#多科目模組)
21. [測試](#測試)
22. [安全設計](#安全設計)
23. [開發流程](#開發流程)
19. [疑難排解](#疑難排解)
20. [授權](#授權)

---

### 特色功能

#### 測驗模式
- 🧠 **四大學習主題**：語詞認知、語言輸入、語言運用、社文語境，單一主題練習。
- 🎯 **綜合練習**：每場 10 題從 4 個主題各取 2-3 題，跨全 8 個類別。最多元的練習。
- ✂️ **排句子**：10 題拖曳排序題，全類別覆蓋（`question_type = 'sorting'`）。瓦片隨機初始順序，必須拖曳。
- 📚 **約 1,920+ 國語文題目 + 32 道數學題目**：32 模板矩陣（4 主題 × 8 類別 × 多句型）+ 57 道臺灣在地化 + 32 道臺灣情境數學題 + 85 道補充題（量詞、反義詞、同義詞、季節、動物、時間、句型）。

#### 防重複／品質
- 🎲 **分層抽題 + 6 小時不重複**：8 個類別輪流抽；6 小時內看過或答過的題目都會被排除。
- 🛡️ **內容指紋去重**：選項 + 正解相同（例如只換人名）的題目，同一場測驗只出現一題，從同類別其他結構不同的題目補上。
- 🔀 **答案位置打亂**：每題正解在 1/2/3/4 隨機分布（約各 25%）。
- 🔄 **拖曳瓦片打亂**：排序題瓦片初始順序為隨機，不是答案順序。
- 🎨 **多種題目句型**：每個認知模板 4 種句子變體輪換，排序題 3 種。
- 🧹 **爭議題目審查**：找出 3 個語序歧義的 sorting 模板（例如「媽媽睡在客廳」與「媽媽在客廳睡」皆通），改寫為強制單一順序的結構；DB 內 196 道既有爭議題目已刪除。

#### 打字遊戲
- 🎮 **單字落下打字遊戲**：100 關難度遞增。
- 🍄 **語詞快打（蘑菇對恐龍）**：類植物大戰殭屍——左邊蘑菇、右邊恐龍逼近，輸入畫面上的詞 + Enter → 蘑菇發射種子打中詞，同時把恐龍推回去。100 關 × 每關 2 分鐘。詞庫為從本機 MIT 授權字典過濾出來的 1,000 個常用 2 字詞。
- 💚 **IME 相容**：使用 `compositionupdate` + `compositionend`，中文輸入法 ON 也能玩。
- ✏️ **注音即時顯示**：IME 組字時注音動態顯示在輸入框。

#### 分數系統（雙幣設計）
- 📊 **經驗值 EXP**（`total_exp`）：從測驗與遊戲累積，永不減少，等級用此。
- 🎁 **兌換獎品分數 reward_points**：獨立的可消費貨幣，與 EXP 同速率累積。預留給未來商店扣減（不影響 EXP）。
- 🆙 **等級門檻翻倍**：Lv1→2 = 5,000，Lv2→3 = 10,000，Lv3→4 = 20,000 ...（`5000 × 2^(lv-1)`）。
- 💯 **1:1 分數換 EXP**：得 80 分 → +80 EXP；通過再 +10 獎勵；打字遊戲每字 1 EXP，語詞快打每詞 `5 + 字數×2` EXP。
- 🏠 **主畫面分數卡**：等級、進度條、總 EXP、兌換分數、連勝火焰，每場結束後自動刷新。
- ❌ **中途離開 = 沒分數**（統一的返回按鈕會丟棄進行中的 session）。

#### 其他玩法
- 🐲 **錯題怪獸**：SM-2-lite 間隔重複（**1h**／24h／72h／168h／336h；連續答對 3 次「淨化」）。剛抓到的怪獸 1 小時內出現，用 **🟢 現在可複習** vs **⏳ 等待 N 分鐘** 區分。
- ⚔️ **班級競技場**：挑戰過去 5 場自己的中位數。
- 🏆 **班級英雄榜**：姓名隱碼成「首字＋同學」。
- 🎤 **語音加分**：Web Speech API（zh-TW）；相似度 ≥70% 答對 +5 XP。
- 📊 **六維度雷達**：準確率、穩定性、廣泛性、認知、耐力、流暢。
- 🔁 **錯題在線再挑戰**：測驗結束後，錯題右邊有「試試」按鈕，旁邊面板答題不計分。支援單選與排序題。

#### 讀音與字典工具
- 📖 **選字讀音助手**：任何頁面選取中文字，右上自動浮出側邊面板，顯示**全部讀音**（破音字會列出全部）＋ 字典釋義。背後是 44,000 詞的 MIT 授權字典常駐記憶體。
- 📖 **讀音工具**：貼上任意文章 → 按開始，每個漢字自動標注音；破音字黃色高亮，點擊可從底部列出的各讀音中選擇。
- 🖋 **筆順練習**：輸入任意漢字，每字一張 Hanzi Writer 卡片，可播放筆順動畫、自己描寫練習、重來。引擎為 `hanzi-writer`（MIT）＋ Make-Me-A-Hanzi 筆畫資料（CDN）。

#### 擴充模組（可列印學習單）
- 📝 **數學練習產生器**：純程序化生成 +／−／×／÷ 題目，可設定難度範圍、題數、連算（2-4 元）。列印時自動隱藏設定區。
- ✍️ **田字格習字紙**：純 CSS 繪製田／米字格，可選示範模式（首格示範／全描紅／全空白）＋ 淡色臨摹列。
- 📋 **練習單列印**：從本機題庫抽題，產出可列印的學習單，學生版／家長版（顯示答案）切換。
- 🖋 **筆順練習**：見上方「讀音與字典工具」。

#### 無障礙與 UI
- 🌟 **SEN 友善模式**：「輕鬆學習模式」——5 題、大字、單欄、1.8 秒防誤觸、50+ 專屬讚美、吉祥物自動隱藏。**絕不出現臨床術語。**
- ✍️ **注音字型系統**：8 種注音字型（粉圓 / 芫荽 / 字嗨楷體 / 源樣黑體 / 源泉圓體 / 字嗨明體 / 王漢宗中楷體 / 王漢宗中明體破音字）＋傳統 `<ruby>/<rt>` 模式。使用者可選，存 `localStorage`。預設 **字嗨楷體**（最像課本字型）。
- 🎴 **直排注音版面**：可重用的 `BopomofoColumn` 元件——聲符／介符／韻符直排，聲調符號在右側獨立欄，符合台灣教科書排版。讀音助手、讀音工具、字典面板、語詞快打都使用此元件。
- ✨ **題目切換轉場**：題與題之間有「第 N 題」splash 卡片彈出，新題從右滑入。讓學生明確知道題目換了。
- ← **統一返回按鈕**：每個頁面／遊戲都有一致的返回按鈕。

#### 學生姓名與歸屬感系統
- 👋 **首頁可編輯中文姓名**：黃色歡迎卡顯示學生姓名（大字），點擊內嵌編輯（1-12 字，後端驗證）。
- 💬 **個人化答題反饋**：測驗 HUD 顯示「第 N 題 ／ {姓名} 加油！」；答題後彈出「{姓名}，答對了！」或「{姓名}，再想想看」，到處看到自己的名字以增強歸屬感。

#### 內容與社群
- 💬 **555 條讚美庫**：503 一般 + 52 SEN 專屬；最近 20 條被排除。
- 📱 **QR Code 家長入口**：5 分鐘一次性 token，零雲端帳號。
- 👩‍🏫 **老師管理台**：班級總覽、PDF、CSV。
- 🌐 **多語言介面**：繁中／英／日／韓。
- 🐹 **AI 兒童測試員**：4 種 persona 的 Playwright 模擬器做 UX 壓測。
- 📦 **前端 code-split**：初始 JS bundle 170KB（gzip 55KB）；7.8 MB 字典與 1,000 詞庫只在對應功能打開時惰性下載。

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
| GET | `/api/quiz/monsters` | 所有 active 錯題怪獸（≤ 20 隻），每筆帶 `is_due` 布林標示。已到複習時間的排前面。 |
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

#### 抽題時的分層採樣 + 6 小時不重複

`quizService.getBucketsByCategory(subject, theory_type)` 把題目依 `category_type` 分桶並快取（5 分鐘 TTL）。`pickDiverseQuestions(buckets, count)` 從 8 個桶輪流挑——一般測驗的 10 題會橫跨全 8 類別、SEN 測驗的 5 題會橫跨 5 類別，從根源消除「10 題長一樣」的痛點。

再加一層：`getRecentlySeenIds(userId, hours=6)` 從 `quiz_details` ↔ `quiz_sessions` join 出該使用者最近 6 小時答過的 `question_id` 集合，先把桶過濾掉，再做分層抽題。如果過濾後不夠抽（例如某主題題庫超少），就回退到完整桶——確保使用者不會看到「題庫不足」。

**效果：同一個學生連跑兩場測驗，第二場一定不會出現第一場任何題目**——直到至少過了 6 小時。

#### 加更多題

```bash
# 編輯 template 的 data[]（如多加一筆 {word, right}）
$EDITOR scripts/questions/templates.ts

# 重 seed（INSERT OR IGNORE 不會重複）
npm run seed:questions
```

---

### 分數與獎勵系統

#### 雙幣設計

| 欄位 | 用途 | 取得方式 | 何時扣除 |
|------|------|----------|----------|
| `total_exp` | 累積經驗值，計算等級用 | 答題分數 + 通過獎勵 + 打字遊戲每字 | **永不扣除** |
| `reward_points` | 兌換獎品分數，未來商店用 | 與 EXP 同速率累積 | 兌換商品時扣除（不影響 EXP） |

> 兩者是**兩個獨立系統**——花掉 reward_points 不會影響等級。

#### 取得 EXP（與 reward_points 同步加值）

| 來源 | 計算式 |
|------|--------|
| 完成 10 題測驗（含中文／數學／綜合／排句子） | `分數 × 1`（每題 10 分，滿分 100） |
| 通過測驗（≥ 60 分） | 額外 +10 |
| SEN 模式（5 題） | 上限 50 分；通過門檻 30 分 |
| 打字遊戲過字 | 每字 +1 EXP（連擊另計 +5） |

> 範例：得 80 分通過 → +80 EXP + 10 通過獎勵 = **90 EXP**（同時 +90 reward_points）。

#### 等級門檻翻倍

```
Lv1 → 2：5,000 EXP
Lv2 → 3：10,000
Lv3 → 4：20,000
Lv4 → 5：40,000
... Lvⁿ → ⁿ⁺¹：5000 × 2^(n-1)
```

實作於 `backend/src/services/quizService.ts::updateExp()`。

#### 分數寫入與刷新

- 後端：每場測驗結束、打字遊戲每字成功都會即時寫 `users.total_exp` + `reward_points`。
- 前端：首頁（`SubjectSelector`）與結算頁（`Result`）`useEffect` 內呼叫 `refreshUser()`，重抓 `/api/auth/me`。
  - 解決舊版 bug：「80 分沒紀錄」其實是首頁顯示 login 當下的舊快取。

#### 中途離開不計分

- 所有測驗／遊戲畫面左上有統一 `← 離開` 按鈕。
- 離開時呼叫 `resetQuiz()`，**不會** call `finishQuiz()`，所以後端 session 沒有 finish_time、不寫 EXP。

---

### 打字遊戲

#### 關卡分區

| 關卡 | 速度（向下落） | 旋轉 | 目標字數 |
|------|--------------|------|---------|
| 1–10 | 0.030 px/frame（慢） | 不旋轉，正方向 | 1→5、2→6、…、10→14 |
| 11–50 | 0.036 px/frame（慢 × 1.2） | 不旋轉，正方向 | = 關卡數 |
| 51–100 | 0.039 px/frame（慢 × 1.3） | 0.3–1.8 度／frame 緩慢旋轉 | = 關卡數 |

`willRotate = level >= 51`；當 `willRotate === false` 時初始角度強制 0。

#### IME（中文輸入法）相容

不用 `keydown` 直接讀鍵盤——讀 `compositionupdate`（即時注音）+ `compositionend`（組字完成的中文字）。

- 輸入法 ON 也能玩，**不需要切英文**。
- 注音動態顯示在輸入欄：注音字型 ON 時，下方注音膠囊隱藏，因為字型已含注音。
- `compositionend` 拿到的字會跟畫面上所有掉落字比對；命中第一個就消除 + 計分。

#### 字源

`GET /api/quiz/vocab` 從 `questions` 表的中文字段抽詞，按國小 3-4 年級高頻字過濾。

#### UI 訊號

- 紅蘑菇 × 3 條命；掉到底部扣一條。
- 連擊計數（COMBO）：連續打對 N 個字，每個 +5 EXP。
- 命結束顯示「💀 GAME OVER」+ 再來一次。

#### 分數寫入

每字打對都 `POST /api/quiz/game-score`（小量寫入，後端 batch）。

---

### 語詞快打（蘑菇對恐龍）

打字遊戲的進階版，把單字換成 2 字詞，並引入 PvZ 風格的「蘑菇 vs 恐龍」對抗。

#### 版面

- 🍄 蘑菇固定在最左邊（玩家）
- 🦖 恐龍從右側 88% 起跑，慢慢往左推進；CSS keyframe 上下彈跳模擬奔跑
- 詞語從右邊飄出來、往左飛
- 底部輸入欄：打詞語 + Enter 發射

#### 機制

- 100 關 × 每關 2 分鐘
- 畫面同時詞數：`min(8, 關卡 × 2)`——Lv 1 = 2、Lv 3 = 6、Lv 5+ = 8。被消除立刻補一個維持滿屏
- 過關條件：在時限內清掉 `min(40, 關卡 × 2)` 個詞，且恐龍未追到
- 恐龍速度：`0.8 + (Lv-1) × 0.04` %/秒（Lv 1 約 100 秒走完、Lv 100 約 17 秒）
- 詞速度：`1.0 + (Lv-1) × 0.04` %/秒
- 答對 → 蘑菇射種子 → 命中詞消失、恐龍被推回 `3 + 詞長度` %
- 3 條紅蘑菇命；詞碰到玩家扣一條
- 失敗條件：HP=0 或 恐龍追到玩家（≤10%）或 時間到

#### 輸入行為

- **只有 Enter 才判定**——避免組字中途誤判（部分前綴比對只是視覺提示）
- 答對 → 發射種子＋清除輸入
- 答錯 → 輸入框紅色 shake 抖動，保留輸入讓玩家修改
- 關卡 overlay 上 Enter = 進下一關／重試／開始；Esc = 回首頁
- `phase === 'playing'` 時自動 focus input

#### 視覺反饋

- **部分比對高亮**：使用者輸入時，符合前綴的詞會黃色放大環標示、其他詞變淡
- **+EXP 浮動氣泡**：打中時從詞的位置往上飄
- **連擊 flash**：連擊 ≥3 時，畫面中央大字「COMBO ×N 🔥」
- **危險區紅色脈動**：恐龍 <28% 時，整個遊戲區紅色脈動
- **越近越大**：恐龍 `font-size` 隨距離縮放（3rem 遠 → 5rem 近）製造壓迫感

#### 詞庫

1,000 個常用 2 字詞，由 `python3 scripts/build_word_vocab.py` 從本機 `backend/data/dictionary.json`（MIT 授權）過濾產出。條件：2 字漢字詞 × 兩字都出現在字典 ≥8 次（字頻自動鎖定常用字）× 主讀音為 2 音節。輸出 `frontend/public/data/common-words.json`（48 KB）。

#### 分數寫入

每打中一個詞：`POST /api/quiz/game-score { exp: 5 + 詞長×2, reward: exp/2, source: 'word-typing-lv${level}' }`。通關獎勵：`10 + Lv × 2` EXP。

---

### 注音字型系統

#### 兩種模式

| 模式 | 條件 | 渲染方式 |
|------|------|----------|
| **A. 標註模式** | `bpmfFont === 'none'`（且 `showZhuyin === true`） | `<ruby>字<rt>ㄓㄨˋ</rt></ruby>` HTML 標籤 |
| **B. 字型模式** | `bpmfFont !== 'none'` | 字元加 `bpmf-font` class，字型自動畫注音 |
| **C. 純文字** | `showZhuyin === false` | 不顯示注音 |

切換瞬間生效（CSS 變數）。

#### CSS 機制

```css
.bpmf-font {
  font-family: var(--bpmf-font-family), 'Noto Sans TC', sans-serif;
  line-height: 1.8;
}
```

`ConfigContext` 把選的字型寫進 `document.documentElement.style.setProperty('--bpmf-font-family', "'BpmfZihiKai'")`。

#### 內建字型來源（位於 `frontend/public/fonts/`）

共 8 種注音字型可選。注音以 OpenType 字形合字內嵌在每個漢字旁，**不需要 `<ruby>` 標籤**。

來源與授權：
- **Bpmf\*** 系列來自 [ButTaiwan / Bopomofo Variants Set (bpmfvs)](https://github.com/ButTaiwan/bpmfvs)，**Apache License 2.0**
- **HanWang\*** 系列來自王漢宗教授中文字型，自由授權使用（需保留出處）

| 字型 family | 底層字型 | 出處 | 風格 | 檔案大小 | 適合 |
|---|---|---|---|---|---|
| **`BpmfZihiKai` 字嗨楷體** | ZihiKaiStd 字嗨楷體（字嗨團隊，教育部標準楷書） | ButTaiwan/bpmfvs | 教育楷書（**預設**） | 17 MB | 課本字型 |
| `HanWangKaiAnnotated` 王漢宗中楷體注音 | 王漢宗中楷體注音（王漢宗教授） | 王漢宗自由授權 | 傳統楷書 | 14 MB | 另一種楷書風格 |
| `BpmfHuninn` 粉圓注音 | jf-openhuninn 粉圓（justfont） | ButTaiwan/bpmfvs | 現代圓體 | 4.4 MB | UI、螢幕閱讀 |
| `BpmfGenSenRounded` 源泉圓體 | Gen Sen Rounded 源泉圓體 | ButTaiwan/bpmfvs | 柔和圓體 | 7.4 MB | 低年級、親切 |
| `BpmfGenYoGothic` 源樣黑體 | Source Han Sans 源樣黑體（Adobe） | ButTaiwan/bpmfvs | 黑體 | 5.2 MB | 高可讀性 |
| `BpmfZihiSerif` 字嗨明體 | ZihiSerif 字嗨明體（字嗨團隊） | ButTaiwan/bpmfvs | 明體 | 6.5 MB | 書本印刷風 |
| `BpmfIansui` 芫荽注音 | Iansui 芫荽（ButTaiwan） | ButTaiwan/iansui | 手寫風 | 7.1 MB | 親切、休閒 |
| `HanWangMingPolyphonic1` 王漢宗中明體破音字一 | 王漢宗中明體破音一（王漢宗教授） | 王漢宗自由授權 | 明體＋破音字異讀 | 3.3 MB | 多音字教學 |

每個字型的授權文件（`LICENSE-2.0.txt` 等）保留在 `fonts/<family>/` 與字型檔一起。

> **載入效率**：`unicode-range` + `font-display: swap` 讓字型只在使用者真正選到時才下載，加更多字型不會影響初始 JS bundle。

#### 設定

- 首頁右上下拉選單（語言切換器旁）
- 選擇存 `localStorage['rm_bpmf_font']`
- 預設 `BpmfZihiKai`（最像國小課本字型）
- 「不用字型（標註注音）」回到傳統 `<ruby>/<rt>` 模式

#### 應用範圍

- `<ZhuyinText>` 元件（自動切兩種模式）
- 測驗題目（`QuizBoard`）
- 答案選項（單選 + 排序瓦片）
- 錯題怪獸複習題目 + 選項
- 結算頁試試面板
- 打字遊戲掉落字（字型模式時下方注音膠囊自動隱藏）

---

### 選字讀音助手

**選任意中文字（題目／答案／釋義），右方自動浮出「讀音 + 釋義」面板**——破音字會列出全部讀音。

#### 範例顯示

選「和」會顯示 5 種讀音：
| 注音 | 釋義（節選） |
|------|-----------|
| ㄏㄜˊ | 1.各數相加的總數。總和 2.平息爭端、停止爭鬥。 |
| ㄏㄜˋ | 1.聲音相應。附和、唱和 |
| ㄏㄢˋ | 連接詞，相當於「跟」。 |
| ㄏㄨˊ | 牌戲中某一方的牌已湊齊成副而獲勝。和牌 |
| ˙ㄏㄨㄛ | 溫暖的。暖和 |

#### 資料來源

移植自 [Bpmf_VSIME / ToneOZ 澳聲通字典](https://toneoz.com)，**MIT 授權**。把原本 268 個 tzdata 分片合併成單一 `backend/data/dictionary.json`（43,986 詞 / 44,710 筆，7.8 MB）。

| 層 | 路徑 | 說明 |
|------|------|-----|
| 匯入腳本 | `scripts/import_dict.py` | 解析 `window.tzdic["N"] = {...}` 分片，合併、`<br>` 換成換行 |
| 後端快取 | `backend/src/services/dictService.ts` | 首次查詢時載入 ~30 MB heap，O(1) `Map` 查表 |
| 後端 API | `GET /api/dict/lookup?q=詞` | 不需登入（公開參考資料）、50 字上限 |
| 前端元件 | `frontend/src/components/common/ReadingHelper.tsx` | document 級 `selectionchange` + `mouseup` 監聽，200 ms debounce，App.tsx 內單一掛載 |

#### 查詢策略

1. **完全比對** — `dict[query]`
2. **最長字首** — 從右邊掉字直到比對到（≥ 2 字）
3. **首字 fallback** — 至少給首字的讀音
4. **逐字分解** — 整詞不在字典時，順便列出每字的讀音供面板顯示

#### 觸發／隱藏

- 觸發：選取**含中文**的字串，長度 ≤ 40，且不在 `<input>`／`<textarea>`／contenteditable 內
- 在面板**裡面**的選取會被忽略（複製釋義不會重新查詢）
- × 關閉按鈕只在下次選字才會再出現

---

### 讀音工具（貼文章標注音）

獨立頁面 `/reading-tool`——貼上整篇文章 → 每個漢字自動標注音、破音字高亮、可逐字選讀音。

#### 版面

```
+---- char block + char block + ... ----+   +-------+
| 漢字 + 注音直排（右側）              |   | 字典  |
| ...標點原樣保留...                   |   | 面板  |
+--------------------------------------+   +-------+
       [◄]  「字」的讀音：[字+讀音1] [字+讀音2] ...  [►]
```

#### 行為

- 貼入文字 → 按「開始」
- 每個漢字渲染成 `char-block`：漢字 + 右側直排注音欄（聲調符號在獨立右欄，符合台灣教科書）
- 有 ≥2 種讀音的字（多音字）黃色底
- 點任意字 → 底部欄列出所有讀音；點擊讀音 → 該位置標記為「已選擇」（綠色）
- 右側字典面板自動顯示點擊位置最長匹配詞的釋義
- ◄ ► 跳到上／下一個多音字（略過普通字）

#### 資料來源

- `GET /api/dict/charmap` → `{ 字: [讀音1, 讀音2, ...] }` 全部單字（約 6,000 字）
- `GET /api/dict/polyphonic` → ≥2 讀音的字（約 552 字）
- `GET /api/dict/lookup?q=<text>` → 詞條釋義

#### 概念與授權

「整篇文章標注音」概念是公共教學工具，本實作為**乾淨重寫**——無任何程式碼、資料、素材複製自第三方工具。注音字典資料與 Hanzi Writer 筆畫資料均為 MIT 授權開源來源（Bopomofo Variant Set 與 Make-Me-A-Hanzi）。

---

### 擴充模組（學習單列印＋筆順練習）

首頁底部一排可選磚塊，提供進階輔助學習工具。全部為**從零實作**——無任何程式碼或資料複製。

#### 數學練習產生器（`/ext/math`）

- 純程序化生成 `+`／`−`／`×`／`÷` 題目
- 可設定：運算類型（多選）、難度（1-10／1-20／1-50／1-100 預設或自訂範圍）、題數、運算元個數（2-4 連算）、家長版顯示答案
- 減法強制非負；除法強制整除；乘法自動降低範圍以免結果過大
- 列印友善：CSS media query 隱藏設定區，列印時自動加上姓名／班級／日期／得分欄

#### 田字格習字紙（`/ext/writing-grid`）

- 生成可列印的習字紙
- 可選格類型（田字格／米字格）、每字格數（2-15）、示範模式（首格示範／全描紅／全空白）、淡色臨摹列
- 漢字用使用者選的注音字型渲染（自動帶注音標註）
- 100% CSS 繪製方格線；無筆畫資料依賴

#### 練習單列印（`/ext/worksheet`）

- 後端 API：`GET /api/quiz/worksheet?subject=chinese&theory=<theory>&count=<n>`
- 從本機題庫隨機抽單選題
- 渲染為可列印的學習單，含姓名／班級／日期／得分欄
- 學生版（選項空白）／家長版（答案標示）切換
- 所有資料來自本地 seeded 題庫，無外部內容

#### 筆順練習（`/ext/stroke`）

- 輸入任意漢字 → 每字一張 Hanzi Writer 卡片，可播放筆順動畫、自己描寫練習、重來
- 引擎：[`hanzi-writer`](https://hanziwriter.org/)（MIT）+ Make-Me-A-Hanzi 筆畫資料（jsdelivr CDN）
- 可調動畫速度、筆畫粗細、外框顯示
- 缺字（罕用 CJK 擴展字）顯示友善的提示

---

### 學生姓名與歸屬感系統

為了讓學生對系統產生認同感，姓名在三個位置顯示。

#### 首頁

`SubjectSelector` 頂部一張顯眼的歡迎卡，顯示學生中文姓名（大字）。點擊卡片進入內嵌編輯（1-12 字，後端驗證）。

#### 測驗 HUD

`QuizBoard` 進度條讀作「第 N 題 / 共 M 題　·　{姓名} 加油！」——每題都看到自己的名字。

#### 個人化答題反饋

每答完一題，畫面中央彈出卡片：
- 答對 → 「{姓名}，答對了！」
- 答錯 → 「{姓名}，再想想看」

卡片用既有的 `combo-flash` keyframe 動畫進場，並在下一題轉場接手前自動消失。

#### 後端

`PATCH /api/auth/me` 接收 `{ display_name }`。驗證：1–12 字，只允許中文／英文／數字／空白。儲存到既有的 `users.display_name` 欄位。`AuthContext` 提供 `updateDisplayName(name)` 方法，呼叫後立即本地 reflect，所有開啟的路由瞬間看到新名字。

---

### 題目切換轉場

題目換題時不再是無聲的瞬間切換。三段反饋依序播放，讓學生明確看到題目換了：

1. **Dwell**（一般 900ms ／ SEN 1400ms）—— 答案按鈕顏色保留，學生看清楚對／錯反饋
2. **Splash overlay**（700ms）—— 畫面中央彈出一張卡片，含 🍄 emoji 與下一題編號。編號在 splash 開始時 snapshot，避免 React 重新渲染時跳號（避免「第 2 題」中途變成「第 3 題」）
3. **Slide-in 題卡**（380ms）—— 新題卡用 CSS keyframe 從右側淡入滑進

實作細節：
- 題卡動畫用 `animation-fill-mode: backwards`，動畫結束後 `transform` **不**保留。保留 `transform: translateX(0)` 仍會建立 transform containing block，導致 `@hello-pangea/dnd` 拖曳排序題瓦片時用 fixed 定位算錯座標而飄走
- `ScoreModal` 的 `animate-pop` 改套到「左欄分數區」單獨一層，retry 面板的 `SortingDisplay` 永遠不在 transform 祖先下

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
