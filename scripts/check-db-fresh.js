// Returns exit code 2 if the DB has stale answers (>60% of single-choice
// questions have correct_answer='1', meaning the shuffle fix hasn't been applied).
// Exit code 0 = DB is fresh or small enough to ignore.
// Used by Run.bat to auto-regenerate before starting servers.
try {
  const Database = require('./backend/node_modules/better-sqlite3');
  const db = new Database('./database/redmushroom.db');
  const total = db.prepare(
    "SELECT COUNT(*) AS n FROM questions WHERE question_type='single_choice'"
  ).get().n;
  const inSlot1 = db.prepare(
    "SELECT COUNT(*) AS n FROM questions WHERE question_type='single_choice' AND correct_answer='1'"
  ).get().n;
  db.close();
  if (total > 20 && inSlot1 / total > 0.6) {
    process.exit(2); // stale: regenerate
  }
  process.exit(0);   // fresh: proceed
} catch (_) {
  process.exit(0);   // DB missing or unreadable: let Run.bat handle it
}
