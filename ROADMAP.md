# Roadmap

> **Canonical progress tracker.** This file is the single source of truth for project
> phases and status. `README.md` shows a short snapshot and links here. Keep both updated
> in the same change as the work they describe (enforced via a commit hook — see below).
>
> Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔁 ongoing · 🗓️ backlog

Last updated: 2026-06-12 (route-coverage honesty — ADR-0010)

> **Current focus:** USA → Switzerland (`us-ch`) **only**, until it is perfected end-to-end.
> All other corridors are deferred (see DECISIONS.md **ADR-0006**). India → Germany (`in-de`)
> is parked as WIP on branch `corridor/in-de`.

> **Audit reference:** A full Playwright UX audit of the reference app was completed 2026-06-12.
> Report: `audit/relocation-app-audit.md`. Finding IDs (F-01…F-12) below trace back to that report.

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

#### 2a — Content & schema ✅ (done)
- [x] Drafted + independently verified (two-agent): **22/22 claims VERIFIED** (5 cantonal-variable fields omitted per ADR-0007), `published: false`
- [x] Schema updated: `timeline`/`cost` optional (ADR-0007)
- [x] Redesigned as interactive app: 3-step wizard + clickable flowchart + task detail panel; visual design matches anikawilliams.com/relocation-app/ _(the flowchart UI was later retired — see 2d)_

#### 2b — UX fixes (mobile blockers) ✅ (superseded by the 2d pivot)
_Findings from the 2026-06-12 Playwright audit. These shipped, then the flowchart they targeted was retired in the 2d pivot — their intent (usable on mobile, persistent state) carries forward into the new experience._
- [x] **F-01/F-02/F-03** mobile layout, header overflow, `localStorage` + browser-back persistence
- [x] **F-04 / F-09** `fitView` / favicon — already present, no change needed
- [x] Progress tracking (`doneIds` + mark-done), carried into the new experience

#### 2d — Guided-form pivot ✅ (ADR-0008, 2026-06-12)
_Founder direction: drop the visual flowchart from the UI; make the whole product a guided form with a "journey + history" sidebar. The dependency graph becomes backend-only._
- [x] Dependency logic extracted to `src/utils/journey.ts` (topological order + lock/unlock); `CorridorFlowchart.tsx` + `@xyflow/react` retired from the render path
- [x] Post-intake experience = one-task-at-a-time guided card + sidebar (progress, editable answer history, journey tracker); mobile collapses the sidebar to a toggle
- [x] **Intake restructured** (replaces the old 3-step wizard): origin + destination split into two steps; passports multi-select (`string[]`); motivation (work/family/study/other) with config-driven conditional follow-ups (`WizardStep[]` + `visibleIf`); intended-stay + children retained
- [x] Country selection gated by published corridors — unsupported countries greyed/unselectable; self-hosted SVG flags (`flag-icons`, per-asset import) for the selectable set
- [x] CWV: island bundle ~59 kB gz → ~9 kB gz (ReactFlow removed); CSS kept at ~17 kB by avoiding the full flag-icons stylesheet — **resolves the old ReactFlow bundle overage**
- [x] Questionnaire fits one screen: card = pinned question header + internally-scrolling options + pinned Back/Continue footer (fullBleed body now `h-screen`); verified question+Continue visible on every step at 375×667 — _supersedes old F-07 (sticky Continue)_
- [x] "Start over" reset in both wizard and plan view, with a confirm guard so answers/progress aren't wiped by an accidental tap

**Next — high-value before scaling to more corridors (this month):**
- [x] **Wire answers → task path** (`appliesIf` evaluation, ADR-0009): safe mini-grammar evaluator (`src/utils/appliesIf.ts`, fail-open, 9 tests) filters tasks by intake answers; "Personalised for you" banner lists skipped steps (**covers F-12**). _Machinery only — per-task `appliesIf` rules are legal judgements and go through the content pipeline; `us-ch.yaml` has none yet, so all 6 tasks still apply to everyone._
- [x] **Route-coverage honesty** (ADR-0010, founder bug report): corridors declare `coversMotivations`; us-ch = `[work]`. A family/study/other user now sees "your route isn't covered yet" on the motivation step and on the plan (header no longer claims "personalised") instead of being silently handed the work-route plan
- [ ] **Family-reunification route for us-ch** via content-researcher → fact-verifier: spouse / registered partner / unmarried partner (concubinage) / children, differentiated by the sponsor's status (citizen vs settled vs permit holder), plus the `appliesIf` rules that route work vs family users — first corridor to exercise the personalisation machinery; retires the "route not covered" notice for family users (ADR-0010)
- [ ] **Alternative & non-traditional routes** (founder, 2026-06-12): research tracks beyond work/family/study so "Another reason" stops being a dead end — each lands as verified content + a `coversMotivations` entry + explicit intake options replacing the free-text "other" box:
  - retirement / financially-independent residence (non-gainful)
  - remote work for a foreign employer (verify whether Switzerland recognises any digital-nomad-style provision, or whether it falls under standard permits)
  - self-employment / starting a business
  - lump-sum taxation ("forfait fiscal") / wealth-based residence
  - study-adjacent stays (language stay, sabbatical, internship/trainee agreements with the US)
- [ ] **Canton-aware path shaping (Switzerland)**: replace the free-text "canton or city" intake field with a canton picker, and let the chosen canton shape next steps — link the exact cantonal migration office, and (longer-term) reinstate the 5 cantonal-variable fee/timeline fields omitted under ADR-0007 as per-canton verified claims. _Content-heavy: every per-canton fact needs the full two-agent pipeline (26 cantons), so machinery first, cantons added incrementally starting with Zürich/Geneva/Vaud/Basel-Stadt/Zug._
- [ ] **EU/EFTA passport branching**: switch the path on a free-movement passport (deferred to capture-only for now — ADR-0008)
- [ ] **F-08** URL state encoding: encode intake answers as search params for shareable/bookmarkable profiles
- [ ] **F-10** Keyboard accessibility pass over the new form + sidebar
- [ ] Remove the now-unused `CorridorFlowchart.tsx` and `@xyflow/react` dependency once the pivot is confirmed stable
- [ ] Destination-specific labels for family/permit options (currently Swiss-specific; see ADR-0008)

**Later — polish (backlog):**
- [ ] **F-11** Link "Data reviewed" date to provenance log / `VERIFICATION_LOG.md`
- [ ] Run axe-core in CI to catch colour-contrast regressions
- [ ] Lighter Serbia flag asset (the `flag-icons` `rs.svg` is ~50 kB gz; only loaded lazily on the passports step today)

#### 2c — Launch readiness ⏳
- [ ] **Sole active corridor: USA → Switzerland (`us-ch`)** — founder approval + flip `published: true` _(blocked on 2b blockers above)_
- [ ] _(deferred)_ India → Germany (`in-de`) — parked WIP on `corridor/in-de`; resume after `us-ch`
- [ ] _(deferred)_ all other corridors until `us-ch` is published
- [ ] Compliance pages: privacy policy, cookie policy, terms (draft, lawyer review pending)
- [ ] Impressum for Germany & Switzerland
- [ ] Contact / About page
- [ ] SEO metadata + JSON-LD per corridor (seo-analyst)
- [ ] Analytics + consent decision implemented (resolve **ADR-0004**)
- [ ] Founder approval of first corridors (human gate)

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
