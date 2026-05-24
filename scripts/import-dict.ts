/**
 * Dictionary importer — ToneOZ tzdic → SQLite `dictionary` table.
 *
 * Source: D:\GameDevZ\dyin\2讀音選擇工具_Bpmf_VSIME\tzdic\tzdata\*.js
 *   Format per file: `window.tzdic["N"] = { "詞":{"z":"注音","d":"釋義HTML"}, ... };`
 *
 * Polyphonic suffix: when the same word has multiple readings, the source
 * stores them under keys like "不", "不2", "不3" — we strip the numeric tail
 * into `reading_idx` so the same word can have multiple rows.
 *
 * Run with: npx tsx scripts/import-dict.ts
 */
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '../database/redmushroom.db');
// 預設讀取使用者的字典原檔位置；可由環境變數覆寫
const SRC_DIR = process.env.TZDIC_SRC ||
  '/mnt/d/GameDevZ/dyin/2讀音選擇工具_Bpmf_VSIME/tzdic/tzdata';

function main() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`[dict] source folder not found: ${SRC_DIR}`);
    console.error(`[dict] set TZDIC_SRC env var to override.`);
    process.exit(1);
  }
  if (!fs.existsSync(DB_PATH)) {
    console.error(`[dict] database not found: ${DB_PATH}`);
    console.error(`[dict] run "npm run setup" first.`);
    process.exit(1);
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  // Ensure schema (idempotent — v4 migration may already have run)
  db.exec(`
    CREATE TABLE IF NOT EXISTS dictionary (
      dict_id     INTEGER PRIMARY KEY,
      word        TEXT NOT NULL,
      reading_idx INTEGER NOT NULL DEFAULT 0,
      zhuyin      TEXT NOT NULL,
      definition  TEXT NOT NULL,
      UNIQUE(word, reading_idx)
    );
    CREATE INDEX IF NOT EXISTS idx_dict_word ON dictionary(word);
  `);

  const files = fs.readdirSync(SRC_DIR)
    .filter((f) => /^\d+\.js$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));

  console.log(`[dict] found ${files.length} tzdata files`);

  // Strip "(變)..." annotation and HTML <br /> from definitions for cleaner display.
  // Keep the structured numbered list but drop noisy whitespace.
  const normalizeDefinition = (raw: string): string =>
    raw
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/\t/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

  const normalizeZhuyin = (raw: string): string =>
    raw.replace(/\s+/g, ' ').trim();

  const insert = db.prepare(
    'INSERT OR REPLACE INTO dictionary (word, reading_idx, zhuyin, definition) VALUES (?, ?, ?, ?)'
  );

  let total = 0;
  let skipped = 0;

  const importAll = db.transaction(() => {
    for (const file of files) {
      const content = fs.readFileSync(path.join(SRC_DIR, file), 'utf-8');
      // Match: window.tzdic["N"] = { ... };
      const m = content.match(/window\.tzdic\["(\d+)"\]\s*=\s*(\{[\s\S]*\})\s*;?\s*$/);
      if (!m) {
        console.warn(`[dict] skip malformed: ${file}`);
        skipped++;
        continue;
      }
      let entries: Record<string, { z: string; d: string }>;
      try {
        entries = JSON.parse(m[2]);
      } catch (e) {
        console.warn(`[dict] JSON parse failed: ${file} — ${(e as Error).message}`);
        skipped++;
        continue;
      }

      for (const [rawKey, val] of Object.entries(entries)) {
        if (!val || typeof val.z !== 'string' || typeof val.d !== 'string') continue;
        // Polyphonic suffix convention (from tzdicentry.js):
        //   ""  → primary reading  (idx 0)
        //   "1" → secondary       (idx 1)
        //   "2" → tertiary        (idx 2)
        const suffixMatch = rawKey.match(/^(.+?)(\d+)$/);
        let word = rawKey;
        let idx = 0;
        if (suffixMatch) {
          word = suffixMatch[1];
          idx = parseInt(suffixMatch[2]);
        }
        insert.run(word, idx, normalizeZhuyin(val.z), normalizeDefinition(val.d));
        total++;
      }
    }
  });

  importAll();

  const count = db.prepare('SELECT COUNT(*) as n FROM dictionary').get() as { n: number };
  console.log(`[dict] imported ${total} entries (skipped ${skipped} files), total rows in DB: ${count.n}`);

  db.close();
}

main();
