/**
 * 讚美語庫 seed：500+ 一般情境 + 50 SEN 友善鼓勵
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { GENERAL_PRAISES } from './praises/general';
import { SEN_PRAISES } from './praises/sen';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database(path.join(__dirname, '../database/redmushroom.db'));
db.pragma('foreign_keys = ON');

const ins = db.prepare(
  `INSERT OR IGNORE INTO praise_library (scenario_type, tone_type, content)
   VALUES (?, ?, ?)`
);

const tx = db.transaction(() => {
  for (const p of GENERAL_PRAISES) ins.run(p.scenario_type, p.tone_type, p.content);
  for (const p of SEN_PRAISES) ins.run('sen_encouragement', p.tone_type, p.content);
});
tx();

interface CountRow { scenario_type: string; n: number }
const counts = db
  .prepare(`SELECT scenario_type, COUNT(*) AS n FROM praise_library GROUP BY scenario_type`)
  .all() as CountRow[];

console.log('[seed-praise] ✅ 完成');
console.table(counts);
db.close();
