-- RedMushroom 資料庫升級腳本（預留）
-- 新增欄位時使用 ALTER TABLE ... ADD COLUMN（SQLite 不支援刪除欄位）

-- 範例：未來若需要新增欄位
-- ALTER TABLE users ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '';
-- ALTER TABLE questions ADD COLUMN difficulty INTEGER NOT NULL DEFAULT 2;

-- 版本記錄
CREATE TABLE IF NOT EXISTS db_migrations (
  version    INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now')),
  description TEXT NOT NULL
);

INSERT OR IGNORE INTO db_migrations (version, description)
VALUES (1, 'Initial schema creation');

-- v2: UNIQUE index on quiz_details(session_id, question_id)
-- Enables pre-inserting "shown but not yet answered" rows so the 6h no-repeat
-- window also covers questions the user saw but abandoned.
CREATE UNIQUE INDEX IF NOT EXISTS idx_details_session_question
ON quiz_details(session_id, question_id);

INSERT OR IGNORE INTO db_migrations (version, description)
VALUES (2, 'UNIQUE index on quiz_details(session_id, question_id)');

-- v3: reward_points = 兌換獎品分數，獨立於 total_exp
ALTER TABLE users ADD COLUMN reward_points INTEGER NOT NULL DEFAULT 0;

INSERT OR IGNORE INTO db_migrations (version, description)
VALUES (3, 'reward_points: separate spendable currency for reward shop');

-- v4: dictionary 表 — 注音 + 釋義（來自 ToneOZ 澳聲通字典）
-- 同一個 word 可以有多個讀音（破音字），用 reading_idx 區分（0 = 主讀音）
CREATE TABLE IF NOT EXISTS dictionary (
  dict_id     INTEGER PRIMARY KEY,
  word        TEXT NOT NULL,
  reading_idx INTEGER NOT NULL DEFAULT 0,
  zhuyin      TEXT NOT NULL,
  definition  TEXT NOT NULL,
  UNIQUE(word, reading_idx)
);
CREATE INDEX IF NOT EXISTS idx_dict_word ON dictionary(word);

INSERT OR IGNORE INTO db_migrations (version, description)
VALUES (4, 'dictionary table from ToneOZ tzdic data (~13k entries)');
