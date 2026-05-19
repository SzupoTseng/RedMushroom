import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');
const SCHEMA_PATH = path.join(__dirname, '../database/init.sql');

console.log('[init-db] 初始化資料庫...');

const dir = path.dirname(DB_PATH);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
db.exec(schema);
db.close();

console.log('[init-db] ✅ 完成');
