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
