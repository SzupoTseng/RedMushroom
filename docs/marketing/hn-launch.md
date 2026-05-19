# Show HN: RedMushroom — open-source Chinese learning RPG for Taiwanese elementary kids

Hi HN, I built RedMushroom (紅蘑菇) — a self-hosted, open-source Chinese language learning system for grades 3–4 in Taiwan. MIT licensed.

**Why:** Existing tools are either ad-driven, SaaS subscriptions, or worksheets. Public school teachers in Taiwan asked for something they could run on a classroom Windows laptop without any cloud, and parents wanted progress visibility without handing over kids' data to an ad network.

**What's in it:**

- ~1500-question matrix across 4 learning theories × 8 daily-life categories, generated from 32 templates with coupled word/meaning data to avoid semantic drift in permutations.
- RPG layer: levels, daily streak fire 🔥, treasure chest milestones at 7/14/30 days, evolving Grammar Sprite pet.
- SEN-friendly "輕鬆學習模式" — large font, anti-mistap 1.8s cooldown, paced 50+ specialty praises, never uses clinical terms in the UI.
- 6-dimension radar analytics (accuracy / stability / breadth / cognition / endurance / fluency).
- QR-code-based parent portal — 5-min one-time token, no cloud account needed.
- Async PvP arena — kids challenge their own past-5-session median, optionally compared to classmates with first-character-masked names.
- Spaced-repetition "error monsters" so wrong answers come back via SM-2-lite (intervals: 6h / 24h / 72h / 168h / 336h). 3 corrects in a row purifies the monster.

**Tech:**

- React 18 + Vite + Tailwind on the front
- Express + TypeScript + better-sqlite3 (synchronous, single file) on the back
- One-click `start.bat` / `start.command` — no Docker, no MySQL, just Node
- 4 UI languages (zh-TW / en / ja / ko) — the curriculum is Mandarin, the chrome is global

**What I'd love feedback on:**

- The praise non-repeat algorithm — currently keeps last-20 in `user_praise_history` and excludes them. Suggestions for something smarter without going AI-heavy?
- The SM-2-lite intervals — anything elementary-age-appropriate I should change?
- Multi-subject module spec at `modules/MODULE_SPEC.md` — does this generalise cleanly to math / nature?

Repo: github.com/SzupoTseng/RedMushroom
