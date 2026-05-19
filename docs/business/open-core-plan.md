# RedMushroom Open-Core Plan

## Mission

Make excellent Chinese-language learning free and self-hostable for every Taiwanese elementary classroom forever, while supporting a small team that can keep building.

## What stays free, MIT, forever

- Everything currently in `main`: ~1500-question matrix, RPG layer (streak fire / treasure chest / Grammar Sprite), SEN mode, 6-dim radar analytics, PDF reports, QR parent portal, i18n, error-monster spaced repetition, async PvP arena, leaderboard, speech-recognition bonus XP, the multi-subject module spec.
- All future security fixes and accessibility improvements.
- All curriculum coverage for grades 3–4 Chinese.

## What sits in a paid "Schools+" SaaS layer

Three things, only:

1. **Cross-class analytics & ministry reporting.** Aggregated, anonymised dashboards for principals and 教育部/縣市教育局 reporting. Requires multi-school authentication and SLA-grade hosting.
2. **AI-generated personalised question expansions.** OpenAI/Claude-powered "weak spot" question generator beyond the ~1500-base matrix. Costs money to run, charged at cost + small margin.
3. **Managed hosting + backup + SSO.** Run-it-for-you for schools that don't have IT. Includes daily backup, identity-provider SSO, uptime SLA.

## What we WILL NEVER do

- Add ads, anywhere.
- Sell or share student data.
- Make any pedagogically-meaningful feature paid-only.
- Make SEN mode paid-only. (Hard line.)
- Make the "free" version visibly degraded.

## License strategy

- Repository stays MIT.
- Paid SaaS layer is closed-source ("Schools+"), running off the open-source core via a stable plugin interface (`modules/` and a server-side `extensions/` directory we'll spec when we get there).
- Trademark "RedMushroom" / "紅蘑菇" used for the SaaS only; forks are encouraged to rebrand.

## Pricing (target, post-MVP)

- **Free / self-host:** NT$0, forever.
- **Schools+ Starter:** NT$3,000 / class / school year — managed hosting + backups.
- **Schools+ District:** NT$30,000 / school / year — adds cross-class analytics & SSO.
- **Schools+ AI Expansion:** NT$1,000 / class / year add-on — AI-generated questions, billed at cost + 30%.

## Sustainability check

If we hit 100 paying classrooms × NT$3,000 = NT$300,000 / year, that funds a 0.5-FTE maintainer at Taiwan rates. That's the realistic ceiling for year 1; year 2 grows via district deals.

## Governance

- Public roadmap on GitHub Projects.
- Curriculum advisory board: 2 active classroom teachers, 1 special-ed teacher, 1 child psychologist. Compensated NT$2,000 / quarter.
- Major curriculum changes require advisory-board sign-off; technical changes do not.

## Exit plan

If the maintainer steps away, the MIT core continues. The "Schools+" name and infra will be archived; nothing breaks for self-hosters.
