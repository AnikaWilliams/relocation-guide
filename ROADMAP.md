# Roadmap

> **Canonical progress tracker.** This file is the single source of truth for project
> phases and status. `README.md` shows a short snapshot and links here. Keep both updated
> in the same change as the work they describe (enforced via a commit hook — see below).
>
> Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔁 ongoing · 🗓️ backlog

Last updated: 2026-06-11

> **Current focus:** USA → Switzerland (`us-ch`) **only**, until it is perfected end-to-end.
> All other corridors are deferred (see DECISIONS.md **ADR-0006**). India → Germany (`in-de`)
> is parked as WIP on branch `corridor/in-de`.

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
- [x] Founder-friendly changelog (`FOUNDER-TLDR.md`) with an auto-reminder hook

### Phase 2 — First corridors & launch readiness ⏳
Get real, verified content live and the site launchable.
- [ ] **Sole active corridor: USA → Switzerland (`us-ch`)** through the full pipeline — perfect before any other (ADR-0006)
  - [x] Drafted + independently verified (two-agent): **22/22 claims VERIFIED** (5 cantonal-variable fields omitted per ADR-0007), `published: false`
  - [x] Schema updated: `timeline`/`cost` optional (ADR-0007)
  - [ ] Founder approval, then flip `published: true`
- [ ] _(deferred)_ India → Germany (`in-de`) — parked WIP on `corridor/in-de`; resume after `us-ch`
- [ ] _(deferred)_ all other corridors until `us-ch` is published
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
| India (`in`) | ⬜ | ✏️ (parked) |
| USA (`us`) | ✅ 22/22 verified — awaiting founder approval | ⬜ |
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
