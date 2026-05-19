import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '../../../database/redmushroom.db');
const SCHEMA_PATH = path.join(__dirname, '../../../database/init.sql');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    // 確保資料庫目錄存在
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    _db = new Database(DB_PATH);

    // 啟用 WAL 模式與外鍵約束
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');

    // 若為新資料庫，執行 schema 初始化
    const tableCount = (_db
      .prepare("SELECT count(*) as cnt FROM sqlite_master WHERE type='table'")
      .get() as { cnt: number }).cnt;

    if (tableCount === 0) {
      const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
      _db.exec(schema);
      console.log('[DB] 資料庫初始化完成');
    }
  }

  return _db;
}

export default getDb;
