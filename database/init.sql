-- RedMushroom（紅蘑菇）SQLite 資料庫初始化腳本
-- 執行環境：better-sqlite3（同步）
-- 注意：所有 ENUM 改用 TEXT + CHECK 約束

PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

-- ─────────────────────────────────────────
-- 使用者表
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  user_id       INTEGER PRIMARY KEY,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  display_name  TEXT    NOT NULL DEFAULT '',
  role          TEXT    NOT NULL DEFAULT 'student'
                        CHECK(role IN ('student','teacher','parent')),
  grade         TEXT    NOT NULL DEFAULT '3',
  subject       TEXT    NOT NULL DEFAULT 'chinese',
  -- Stage 7: RPG
  total_exp       INTEGER NOT NULL DEFAULT 0, -- 經驗值：用於升等，只增不減
  reward_points   INTEGER NOT NULL DEFAULT 0, -- 兌換獎品分數：可花費的獨立貨幣
  current_level   INTEGER NOT NULL DEFAULT 1,
  praise_streak   INTEGER NOT NULL DEFAULT 0,
  -- Stage 12A: 連勝
  last_quiz_date TEXT,
  streak_days   INTEGER NOT NULL DEFAULT 0,
  max_streak    INTEGER NOT NULL DEFAULT 0,
  -- Stage 12B: PvP
  class_id      TEXT,
  -- Stage 13: SEN 特教模式
  is_sen_mode   INTEGER NOT NULL DEFAULT 0,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 題庫表
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS questions (
  question_id   INTEGER PRIMARY KEY,
  subject       TEXT    NOT NULL DEFAULT 'chinese',
  theory_type   TEXT    NOT NULL
                        CHECK(theory_type IN ('cognitive','input','usage','sociocultural')),
  category_type TEXT    NOT NULL
                        CHECK(category_type IN ('food_shopping','social','travel','business',
                                                'health','leisure','housing','digital')),
  question_type TEXT    NOT NULL
                        CHECK(question_type IN ('single_choice','sorting')),
  -- content: JSON array of ZhuyinChar {char, pinyin}
  -- e.g. [{"char":"我","pinyin":"ㄨㄛˇ"},{"char":"想","pinyin":"ㄒㄧㄤˇ"}]
  content       TEXT    NOT NULL,
  -- options: JSON object {"1":"...","2":"...","3":"...","4":"..."}
  options       TEXT    NOT NULL,
  correct_answer TEXT   NOT NULL,
  explanation   TEXT    NOT NULL DEFAULT '',
  score         INTEGER NOT NULL DEFAULT 10,
  -- Stage 15B: i18n prompts
  -- {"zh-TW":"請排出正確語序：","en":"Arrange the correct word order:","ja":"..."}
  prompt_i18n   TEXT    NOT NULL DEFAULT '{"zh-TW":"請選出正確答案："}',
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 測驗回合表
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_sessions (
  session_id       INTEGER PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(user_id),
  subject          TEXT    NOT NULL DEFAULT 'chinese',
  theory_type      TEXT    NOT NULL,
  start_time       TEXT    NOT NULL DEFAULT (datetime('now')),
  end_time         TEXT,
  total_score      INTEGER,
  is_passed        INTEGER NOT NULL DEFAULT 0,
  -- Stage 12B: PvP
  duration_seconds INTEGER,
  pvp_mode         INTEGER NOT NULL DEFAULT 0,
  pvp_target_score INTEGER,
  pvp_target_secs  INTEGER
);

-- ─────────────────────────────────────────
-- 每題作答紀錄表
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS quiz_details (
  detail_id     INTEGER PRIMARY KEY,
  session_id    INTEGER NOT NULL REFERENCES quiz_sessions(session_id),
  question_id   INTEGER NOT NULL REFERENCES questions(question_id),
  user_answer   TEXT,
  is_correct    INTEGER NOT NULL DEFAULT 0,
  -- Stage 11A: 語音口說
  speech_score  INTEGER,
  speech_text   TEXT
);

-- ─────────────────────────────────────────
-- 讚美語庫表
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS praise_library (
  praise_id     INTEGER PRIMARY KEY,
  scenario_type TEXT    NOT NULL
                        CHECK(scenario_type IN (
                          'perfect_score','passed','failed_encouragement',
                          'streak_bonus','level_up','weakness_improved',
                          'sen_encouragement'
                        )),
  tone_type     TEXT    NOT NULL
                        CHECK(tone_type IN ('enthusiastic','growth_mindset','humorous')),
  content       TEXT    NOT NULL
);

-- ─────────────────────────────────────────
-- 避免重複讚美紀錄
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_praise_history (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(user_id),
  praise_id  INTEGER NOT NULL REFERENCES praise_library(praise_id),
  used_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 五維度指標快取（Stage 8）
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_stats (
  user_id      INTEGER PRIMARY KEY REFERENCES users(user_id),
  accuracy     REAL    NOT NULL DEFAULT 0,
  stability    REAL    NOT NULL DEFAULT 0,
  versatility  REAL    NOT NULL DEFAULT 0,
  cognition    REAL    NOT NULL DEFAULT 0,
  endurance    REAL    NOT NULL DEFAULT 0,
  fluency      REAL    NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 錯題怪獸（Stage 11B）
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_error_monsters (
  id                INTEGER PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(user_id),
  question_id       INTEGER NOT NULL REFERENCES questions(question_id),
  streak_correct    INTEGER NOT NULL DEFAULT 0,
  next_review_time  TEXT    NOT NULL DEFAULT (datetime('now')),
  status            TEXT    NOT NULL DEFAULT 'active'
                            CHECK(status IN ('active','purified')),
  UNIQUE(user_id, question_id)
);

-- ─────────────────────────────────────────
-- 虛擬倉庫（Stage 12A）
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_items (
  item_id     INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id),
  item_name   TEXT    NOT NULL,
  item_type   TEXT    NOT NULL CHECK(item_type IN ('title','pet_skin')),
  obtained_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────────────────────
-- 文法小精靈寵物（Stage 12C）
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sprites (
  user_id          INTEGER PRIMARY KEY REFERENCES users(user_id),
  sprite_name      TEXT    NOT NULL DEFAULT '小蘑菇',
  current_form     TEXT    NOT NULL DEFAULT 'egg'
                           CHECK(current_form IN ('egg','baby','knight','god')),
  cognitive_exp    INTEGER NOT NULL DEFAULT 0,
  input_exp        INTEGER NOT NULL DEFAULT 0,
  usage_exp        INTEGER NOT NULL DEFAULT 0,
  sociocultural_exp INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────────────────────
-- QR Code 行動授權（Stage 17A）
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mobile_linking_tokens (
  token_id    INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(user_id),
  link_token  TEXT    NOT NULL UNIQUE,
  status      TEXT    NOT NULL DEFAULT 'pending'
                      CHECK(status IN ('pending','used','expired')),
  expires_at  TEXT    NOT NULL
);

-- ─────────────────────────────────────────
-- 索引優化
-- ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_theory_question
  ON questions(theory_type, question_id);

CREATE INDEX IF NOT EXISTS idx_subject_theory
  ON questions(subject, theory_type, question_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user
  ON quiz_sessions(user_id);

-- UNIQUE so startQuiz can pre-insert placeholder rows (empty answer) and
-- submitAnswer can REPLACE them.  Also serves as the covering index for
-- session lookups.
CREATE UNIQUE INDEX IF NOT EXISTS idx_details_session_question
  ON quiz_details(session_id, question_id);

CREATE INDEX IF NOT EXISTS idx_praise_scenario_tone
  ON praise_library(scenario_type, tone_type);

CREATE INDEX IF NOT EXISTS idx_monsters_user_time
  ON user_error_monsters(user_id, next_review_time);

CREATE INDEX IF NOT EXISTS idx_mobile_token
  ON mobile_linking_tokens(link_token);

CREATE INDEX IF NOT EXISTS idx_users_class
  ON users(class_id);
