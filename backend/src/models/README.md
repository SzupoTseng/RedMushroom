# `backend/src/models/` — intentionally empty

This project does **not** use a separate model / repository / DAO layer.

All database access goes through `backend/src/db/database.ts` (`getDb()` returns a `better-sqlite3` handle) and is called directly from `services/*.ts`. The rationale:

1. **Synchronous SQLite is fast.** A separate ORM layer adds latency and async cognitive load for no benefit at this scale (single classroom, ~1500 questions).
2. **Service-level SQL is easier to audit for IDOR.** `WHERE user_id = ?` is right there next to the business logic, not hidden behind a method abstraction.
3. **One layer fewer to test.** Services are tested directly with vitest using the real DB; no mocks needed.

If you ever migrate to PostgreSQL or need transactions across service boundaries, this is the place to add a real model layer. Until then, leave it empty.

See `CLAUDE.md` §3 for the full architectural rules.
