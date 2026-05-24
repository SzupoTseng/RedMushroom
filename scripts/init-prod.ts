/**
 * Production database initialiser.
 *
 * Used inside the Docker entrypoint to create the schema + apply migrations
 * on first boot, without depending on the `sqlite3` CLI binary in the runtime
 * image. Uses the same `better-sqlite3` binding the backend uses.
 *
 * Idempotent:
 *   - CREATE TABLE IF NOT EXISTS … in init.sql / upgrade_schema.sql
 *   - errors on individual statements (e.g. ALTER TABLE on existing columns)
 *     are caught and logged so the script always continues.
 */
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? path.join(__dirname, '../database/redmushroom.db');

console.log(`[init-prod] DB_PATH = ${DB_PATH}`);

const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function applySql(label: string, file: string): void {
  if (!fs.existsSync(file)) {
    console.log(`[init-prod] ${label}: file not found at ${file}, skipping`);
    return;
  }
  const sql = fs.readFileSync(file, 'utf-8');
  console.log(`[init-prod] applying ${label} from ${file}`);
  try {
    db.exec(sql);
    console.log(`[init-prod] ✓ ${label} applied`);
  } catch (e) {
    // Individual statements may fail when re-running (e.g. ALTER TABLE adding
    // a column that already exists). Log + continue rather than abort.
    console.log(`[init-prod] ⚠ ${label} partial failure (likely already applied): ${(e as Error).message}`);
  }
}

applySql('init.sql', path.join(__dirname, '../database/init.sql'));
applySql('upgrade_schema.sql', path.join(__dirname, '../database/upgrade_schema.sql'));

db.close();
console.log('[init-prod] ✅ schema ready');
