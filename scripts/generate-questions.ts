import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildQuestionMatrix } from './questions/matrix';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../database/redmushroom.db');

const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

console.log('[generate-questions] 開始生成題庫矩陣 ...');

const questions = buildQuestionMatrix();

const insertQ = db.prepare(`
  INSERT OR IGNORE INTO questions
    (subject, theory_type, category_type, question_type, content, options, options_zhuyin, correct_answer, explanation, score)
  VALUES (@subject, @theory_type, @category_type, @question_type, @content, @options, @options_zhuyin, @correct_answer, @explanation, @score)
`);

const insertMany = db.transaction((qs: typeof questions) => {
  for (const q of qs) insertQ.run(q);
});
insertMany(questions);

console.log(`[generate-questions] ✅ 寫入 ${questions.length} 題`);
db.close();
