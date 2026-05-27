/**
 * Comprehensive DB report — dumps schema, migrations, counts, and polyphonic
 * spot-checks to stdout. Called at the end of reseed-db.bat so the log shows
 * exactly what got seeded and whether polyphonic readings are correct.
 *
 *   npx tsx scripts/dump-db-report.ts
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

/* eslint-disable @typescript-eslint/no-explicit-any */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');

const db = new Database(DB_PATH, { readonly: true });
const section = (t: string) => console.log(`\n===== ${t} =====`);
const cnt = (sql: string, ...p: unknown[]): number =>
  ((db.prepare(sql).get(...p) as any)?.n ?? 0);

section('SCHEMA: questions columns');
for (const c of db.prepare('PRAGMA table_info(questions)').all() as any[]) {
  console.log(`  ${c.name} ${c.type}`);
}

section('SCHEMA: users columns');
for (const c of db.prepare('PRAGMA table_info(users)').all() as any[]) {
  console.log(`  ${c.name} ${c.type}`);
}

section('MIGRATIONS APPLIED');
try {
  for (const m of db.prepare('SELECT version, description FROM db_migrations ORDER BY version').all() as any[]) {
    console.log(`  v${m.version}  ${m.description}`);
  }
} catch {
  console.log('  (no db_migrations table)');
}

section('COUNTS');
console.log('  questions total       :', cnt('SELECT COUNT(*) n FROM questions'));
for (const r of db.prepare('SELECT subject, COUNT(*) n FROM questions GROUP BY subject').all() as any[]) {
  console.log(`    - ${r.subject}: ${r.n}`);
}
console.log('  options_zhuyin SET    :', cnt('SELECT COUNT(*) n FROM questions WHERE options_zhuyin IS NOT NULL'));
console.log('  options_zhuyin NULL   :', cnt('SELECT COUNT(*) n FROM questions WHERE options_zhuyin IS NULL'));
try { console.log('  praise lines          :', cnt('SELECT COUNT(*) n FROM praise_library')); } catch { /* ignore */ }
try { console.log('  users                 :', cnt('SELECT COUNT(*) n FROM users')); } catch { /* ignore */ }

// NOTE: content is stored as per-char JSON ([{char,pinyin},...]), so chars of
// a word are NOT adjacent in the raw string — must parse JSON, not LIKE.
type ZC = { char: string; pinyin: string };
const allChinese = db.prepare(
  "SELECT content, options_zhuyin FROM questions WHERE subject='chinese'"
).all() as any[];

section('POLYPHONIC SPOT-CHECK (prompt content)');
const words = ['音樂', '一個', '教', '長大', '重複', '銀行', '快樂'];
for (const w of words) {
  let found = '';
  for (const r of allChinese) {
    const arr = JSON.parse(r.content) as ZC[];
    const text = arr.map((c) => c.char).join('');
    const start = text.indexOf(w);
    if (start >= 0) {
      found = arr.slice(start, start + [...w].length)
        .map((c) => `${c.char}=${c.pinyin}`).join(' ');
      break;
    }
  }
  console.log(`  ${w.padEnd(4)} -> ${found || '(not found in any prompt)'}`);
}

section('OPTIONS_ZHUYIN SPOT-CHECK (answer tiles)');
const targets = /[個樂教長重和為得行]/;
let shown = 0;
for (const r of allChinese) {
  if (!r.options_zhuyin) continue;
  const oz = JSON.parse(r.options_zhuyin) as Record<string, ZC[]>;
  for (const arr of Object.values(oz)) {
    const s = arr.map((c) => `${c.char}=${c.pinyin}`).join(' ');
    if (targets.test(s)) { console.log(`  ${s}`); shown++; }
    if (shown >= 15) break;
  }
  if (shown >= 15) break;
}
if (shown === 0) console.log('  (no option tiles with target polyphonic chars found)');

db.close();
console.log('\n[dump-db-report] done.');
