# Roadmap

> **Canonical progress tracker.** This file is the single source of truth for project
> phases and status. `README.md` shows a short snapshot and links here. Keep both updated
> in the same change as the work they describe (enforced via a commit hook — see below).
>
> Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔁 ongoing · 🗓️ backlog

Last updated: 2026-06-09

---

## Phases

### Phase 0 — Governance scaffold ✅
Foundation rules and roles, before any code.
- [x] `CLAUDE.md` (operating rules), `DECISIONS.md` (ADRs), `VERIFICATION_LOG.md`
- [x] Sub-agent roster in `.claude/agents/`

### Phase 1 — Technical foundation ✅
The Astro application and the accuracy-enforcement machinery (no content yet).
- [x] Astro 4 + React islands + Tailwind + sitemap; static output (Cloudflare Pages)
- [x] Canonical content schema (`Claim` / `Task` / `Corridor`) with Zod
- [x] **Build gate**: `astro build` fails on any non-`VERIFIED` or stale rendered claim
- [x] Base layout, legal disclaimer, visible provenance, corridor flowchart island
- [x] Home page + corridor route (`/{origin}/{destination}/`)
- [x] Unit tests for the gate (14 cases); `astro check` clean
- [x] Project on GitHub (`develop`, `feat/phase-1-foundation` pushed)
- [x] `ROADMAP.md` + README progress tracking, with commit-time enforcement
- [x] CI on PRs (GitHub Actions): build, type-check, tests, provenance gate + ROADMAP-sync check

### Phase 2 — First corridors & launch readiness ⏳
Get real, verified content live and the site launchable.
- [ ] First corridor (`in-de` India → Germany) through the full pipeline
- [ ] Second corridor (`us-ch` USA → Switzerland)
- [ ] Compliance pages: privacy policy, cookie policy, terms (draft, lawyer review pending)
- [ ] Impressum for Germany & Switzerland
- [ ] Contact / About page
- [ ] SEO metadata + JSON-LD per corridor (seo-analyst)
- [ ] Analytics + consent decision implemented (resolve **ADR-0004**)
- [ ] Founder approval of first corridors (human gate)
- [ ] Decide flowchart island CWV budget (~59 KB gz > 50 KB target)

### Phase 3 — Accuracy system 🔁 (ongoing from Phase 1)
The non-negotiable provenance rules — enforced continuously, not a one-off phase.
- [x] Provenance fields required at compile time; build gate at render time
- [ ] Two-agent verification practised on every corridor (researcher ≠ verifier)
- [ ] `link-auditor` CI: weekly source-URL + soft-404 + content-drift checks
- [ ] Automated staleness flagging (90-day / 30-day review windows) surfaced in CI

### Phase 4 — Monetisation & scale 🗓️
- [ ] AdSense readiness (15+ pages, policy pages, HTTPS) + review submission
- [ ] Ad placement behind CMP consent gate (no CWV regressions)
- [ ] Wave-1 origins × Wave-1 destinations coverage
- [ ] Wave-2 destinations (France, Netherlands, UK, Ireland) and origins

---

## Corridor coverage

Status per corridor: ⬜ not started · ✏️ drafted (`UNVERIFIED`) · 🔎 in verification ·
✅ published. Destinations/origins per ADR-0003 (Wave 1 first).

| Origin ↓ \ Dest → | Switzerland (`ch`) | Germany (`de`) |
|---|---|---|
| India (`in`) | ⬜ | ⬜ |
| USA (`us`) | ⬜ | ⬜ |
| UK (`gb`) | ⬜ | ⬜ |
| Canada (`ca`) | ⬜ | ⬜ |
| Australia (`au`) | ⬜ | ⬜ |
| Philippines (`ph`) | ⬜ | ⬜ |
| China (`cn`) | ⬜ | ⬜ |

_Wave 2 origins (Serbia, Russia, Ukraine) and destinations added as those waves open._

---

## Pending decisions
- **ADR-0004 (analytics & consent):** Plausible + GA4-behind-CMP recommended; awaiting founder sign-off.
- **ADR-0005 schema additions** (`published`, `title`/`description`, `CategoryEnum`): implemented; awaiting founder confirmation.
- **Production domain / `site` URL:** placeholder until registered (affects canonical URLs + sitemap).
