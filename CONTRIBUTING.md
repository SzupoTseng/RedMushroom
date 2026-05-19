# Contributing to RedMushroom 🍄

Thanks for considering a contribution! RedMushroom serves elementary school children in Taiwan; please prioritise **kid safety**, **accessibility (SEN-friendly)**, and **simplicity** in everything you submit.

## Quick start

```bash
npm run setup     # installs deps, builds DB, seeds demo data
npm start         # frontend on :5173, backend on :3001
```

Demo accounts: `teacher` / `teacher123`, `student1` / `student123`.

## Rules of the road

1. **Read `CLAUDE.md` first** — every architectural rule lives there.
2. **All SQL touching student data MUST include `WHERE user_id = ?`** — IDOR is the only thing that gets a PR auto-blocked.
3. **`/api/quiz/start` must never include `correct_answer`** in its response. This is enforced by service-layer code in `quizService.ts`; do not work around it.
4. **No clinical terminology in the UI.** SEN mode is "輕鬆學習模式". Never "遲緩" / "特教".
5. **No `ORDER BY RANDOM()` over full tables** for production paths. Use the in-memory Fisher-Yates cache pattern in `quizService.ts:53-68`.
6. **No `any`** in TypeScript. Define `interface`/`type` for every API boundary.
7. **All `/api/quiz/*` and `/api/admin/*` routes pass through `authMiddleware`**. JWT-decoded `req.user.user_id` is the only trusted user-id source.

## What to work on

- Issues labelled `good-first-issue` are scoped and welcoming.
- Larger features should be discussed in an issue first.
- Subject expansion (math/nature/social/english modules) — see `modules/MODULE_SPEC.md`.

## Tests

```bash
cd backend && npm test       # vitest unit tests (services)
npm run test:e2e             # Playwright end-to-end
```

When adding new services, include vitest unit tests next to the implementation (`*.test.ts`).

## Commits

Conventional Commits style (`feat:`, `fix:`, `chore:`, `docs:`). One feature per PR; bundle related fixes.

## Code review

PRs are reviewed for: security (IDOR/XSS/SQLi), kid-safety wording, accessibility, and adherence to `CLAUDE.md`.

## License

By contributing you agree your contributions are licensed under the MIT License.
