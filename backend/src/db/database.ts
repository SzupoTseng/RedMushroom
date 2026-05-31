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

    // 對「既有」資料庫補上新欄位（SQLite 沒有 ADD COLUMN IF NOT EXISTS）。
    // 每次開機冪等執行：欄位已存在就跳過，缺了就補。這讓持久化的舊 DB
    // 在部署新版後端時不會因缺欄位而報「no such column」。
    runMigrations(_db);
  }

  return _db;
}

function runMigrations(db: Database.Database): void {
  const ensureColumn = (table: string, column: string, ddl: string): void => {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    if (cols.length > 0 && !cols.some((c) => c.name === column)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
      console.log(`[DB] migration: added ${table}.${column}`);
    }
  };
  // additive column migrations (mirror database/upgrade_schema.sql)
  ensureColumn('users', 'reward_points', 'reward_points INTEGER NOT NULL DEFAULT 0');
  ensureColumn('questions', 'options_zhuyin', 'options_zhuyin TEXT');
  // question_level: 0 = 重複練習模式（同題幹會反覆出現，適合 SEN/低年級）
  //                 1 = 多樣化模式（stem-aware LRU，最大化覆蓋）
  ensureColumn('users', 'question_level', 'question_level INTEGER NOT NULL DEFAULT 0');
  // correct_answer_alt: 排句子題的替代正解（|-分隔多個），例如
  //   主詞A + 副詞 + 可逆動詞 + 主詞B 與 主詞B + 副詞 + 可逆動詞 + 主詞A 皆通順時，
  //   correct_answer="1,2,3,4"、correct_answer_alt="4,2,3,1"
  ensureColumn('questions', 'correct_answer_alt', 'correct_answer_alt TEXT');
}

export default getDb;
