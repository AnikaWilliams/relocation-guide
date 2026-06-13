# Roadmap

> **Canonical progress tracker.** This file is the single source of truth for project
> phases and status. `README.md` shows a short snapshot and links here. Keep both updated
> in the same change as the work they describe (enforced via a commit hook — see below).
>
> Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔁 ongoing · 🗓️ backlog

Last updated: 2026-06-13 (source-snapshot cache + content-drift detection spec'd + core-implemented via agent team, ADR-0017; corridor production via agent teams — research then a separate verification run, ADR-0016, USA → Western Europe + UK batch queued. Plus: all-routes intake + launch waitlist (ADR-0015); launch-readiness drafts, og:image, dormant consent+analytics (ADR-0013), us-ch founder approval (ADR-0014); go-live blocked on domain)

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
- [x] Country selection gated by published corridors — unsupported countries greyed/unselectable; self-hosted SVG flags (`flag-icons`, per-asset import) for the selectable set _(superseded 2026-06-13: every country is now selectable; non-live routes lead to a waitlist — see 2e / ADR-0015)_
- [x] CWV: island bundle ~59 kB gz → ~9 kB gz (ReactFlow removed); CSS kept at ~17 kB by avoiding the full flag-icons stylesheet — **resolves the old ReactFlow bundle overage**
- [x] Questionnaire fits one screen: card = pinned question header + internally-scrolling options + pinned Back/Continue footer (fullBleed body now `h-screen`); verified question+Continue visible on every step at 375×667 — _supersedes old F-07 (sticky Continue)_
- [x] "Start over" reset in both wizard and plan view, with a confirm guard so answers/progress aren't wiped by an accidental tap

**Next — high-value before scaling to more corridors (this month):**
- [x] **Document checklists + de-densified task detail (ADR-0012)** — every one of the 21 tasks now has structured `documents` (provide vs. official `form`, each form-link a build-gated/link-audited Claim to the issuing authority's own page, never self-hosted) + a distilled `tldr` + 3-5 `keyFacts`. Built via a Workflow (parallel research + independent verification, serialized per-group writes); `register-commune` + `ahv-social-security` sourced from Fedlex statutes after the verifier's server-side WebFetch hit ch.ch's datacenter block. **218/218 VERIFIED.** _Systemic note: agent `WebFetch` is datacenter-blocked on ch.ch — content verification touching ch.ch must use the Fedlex/local-curl path._
- [x] **Wire answers → task path** (`appliesIf` evaluation, ADR-0009): safe mini-grammar evaluator (`src/utils/appliesIf.ts`, fail-open, 9 tests) filters tasks by intake answers. _Machinery only — per-task `appliesIf` rules are legal judgements and go through the content pipeline._ ~~"Personalised for you" banner (F-12)~~ — the skipped-steps banner was **removed per founder request (2026-06-12)**; filtering still happens silently, F-12 (the visible summary) is intentionally dropped.
- [x] **Route-coverage honesty** (ADR-0010, founder bug report): corridors declare `coversMotivations`; us-ch = `[work]`. A family/study/other user now sees "your route isn't covered yet" on the motivation step and on the plan (header no longer claims "personalised") instead of being silently handed the work-route plan
- [x] **Family-reunification route for us-ch** (2026-06-12, two-agent): 6 new tasks (spouse/registered partner split by sponsor status citizen/settled/B-holder per FNIA Art. 42/43/44, unmarried partner = honest cantonal-discretion path, children, family D visa); **27/27 claims independently VERIFIED** (VERIFICATION_LOG.md), all `appliesIf` rules approved by the verifier; `coversMotivations: [work, family]` flipped — family users now get a real personalised plan, work-entry tasks gated to work users. Total corridor: **49 verified claims, 12 tasks, 2 routes.** _Follow-ups flagged: `familyJoineeStatus == 'other'` catch-all task; `ahv-social-security` + `register-commune` presume employment (need family-aware variants); `hashchange` listener for same-page profile links_
- [ ] **Alternative & non-traditional routes** (founder, 2026-06-12): research tracks beyond work/family/study so "Another reason" stops being a dead end — each lands as verified content + a `coversMotivations` entry + explicit intake options replacing the free-text "other" box:
  - [x] retirement / financially-independent residence (non-gainful) — **LIVE 2026-06-12**: 3 tasks / 20 claims verified 20/20 (FNIA Art. 28 + VZAE Art. 25, discretion stated plainly; non-employed OASI task replaces the employee one via verifier-approved `appliesIf`); "Retirement" added to intake + URL codec; corridor now **69 verified claims, 15 tasks, 3 routes**
  - remote work for a foreign employer (verify whether Switzerland recognises any digital-nomad-style provision, or whether it falls under standard permits)
  - self-employment / starting a business
  - lump-sum taxation ("forfait fiscal") / wealth-based residence
  - study-adjacent stays (language stay, sabbatical, internship/trainee agreements with the US)
- [ ] **Canton-aware path shaping (Switzerland)**: replace the free-text "canton or city" intake field with a canton picker, and let the chosen canton shape next steps — link the exact cantonal migration office, and (longer-term) reinstate the 5 cantonal-variable fee/timeline fields omitted under ADR-0007 as per-canton verified claims. _Content-heavy: every per-canton fact needs the full two-agent pipeline (26 cantons), so machinery first, cantons added incrementally starting with Zürich/Geneva/Vaud/Basel-Stadt/Zug._
- [ ] **EU/EFTA passport branching**: switch the path on a free-movement passport (deferred to capture-only for now — ADR-0008)
- [x] **F-08** URL state encoding (2026-06-12): plan-affecting answers encoded in the URL **fragment** (`/us/ch/#pp=us&m=work&ws=has-offer&dur=long&kids=0`) for shareable/bookmarkable profiles. Fragment, not search params, per the compliance share-link ruling — the fragment is never sent in HTTP requests, so answers can't land in server/CDN logs or analytics; free-text answers are never encoded. Restore precedence: URL > localStorage > defaults; a URL with intake params fully determines the plan (codec: `src/utils/urlState.ts`, 15 tests)
- [x] **F-08 follow-up** (2026-06-12): "Copy link to this plan" button in the plan sidebar with the compliance-required pre-share warning ("This link contains your answers…"); clipboard-API failure falls back to a URL prompt
- [x] **SEO progressive enhancement** (ADR-0011, 2026-06-12): corridor pages are scrollable documents again — app as a viewport-height hero, the complete guide rendered below as real always-visible markup (all tasks, steps, documents, sources, last-verified dates). Googlebot now indexes the actual verified content instead of the wizard; footer (with Impressum) now reachable from corridor pages; noscript overlay retired
- [x] **F-10** Keyboard accessibility pass (qa-engineer, 2026-06-12): focus management on step/task transitions (focus moves to the new heading — fixes focus stranded on `<body>`), `aria-pressed` on option/country/passport cards, `aria-expanded` on the mobile journey toggle, `aria-current="step"` + sr-only Done/Locked prefixes in the sidebar, sr-only "Edit answer:" on recap buttons, disabled-country explanation in accessible names. Plus 16 route-personalisation regression tests pinning exact applicable-task sets per intake profile against the real YAML (68 tests total)
- [x] Removed the unused `CorridorFlowchart.tsx` and uninstalled `@xyflow/react` (2026-06-12) — pivot confirmed stable; 20 npm packages dropped
- [ ] Destination-specific labels for family/permit options (currently Swiss-specific; see ADR-0008)

**Later — polish (backlog):**
- [ ] **F-11** Link "Data reviewed" date to provenance log / `VERIFICATION_LOG.md`
- [ ] Run axe-core in CI to catch colour-contrast regressions
- [ ] Lighter Serbia flag asset (the `flag-icons` `rs.svg` is ~50 kB gz; only loaded lazily on the passports step today)
- [ ] Structural a11y (QA findings, 2026-06-12, non-blocking): single-select steps as `role="radiogroup"` with arrow keys _(remaining)_. Done 2026-06-12: `role="status"` announcements on the personalised + route-coverage banners and the progress count; sidebar section labels are now real `h2` headings
- [x] `hashchange` listener (2026-06-12): pasting/clicking a share link on an already-open corridor page now applies the profile without a reload (plain anchors like `#full-guide` ignored)

#### 2e — All-routes intake + launch waitlist ✅ (ADR-0015, 2026-06-13)
_Founder request: stop greying out countries; capture demand for routes we haven't built yet._
- [x] **Every country selectable** in the origin/destination grids (no disabled options, nothing preselected on first open, no per-country availability badge); route-live predicate centralised in `src/utils/routes.ts` (`isRouteLive`)
- [x] **Waitlist phase**: completing the intake for a non-published corridor routes to a dedicated "not live yet" screen (never a 404) capturing email (required) + phone (optional) behind explicit, unticked consent (`WaitlistPanel` + `src/utils/waitlist.ts`)
- [x] **Dormant by default** (mirrors ADR-0013): no `PUBLIC_WAITLIST_ENDPOINT` → signup kept on-device only (`rg-waitlist-v1`), nothing transmitted; coarse payload only (route + motivation + contact, never free text) when enabled. Privacy/Cookie drafts + `.env.example` updated
- [x] **Verified**: 79 unit tests incl. exhaustive 324-pair origin×destination matrix (only us→ch live); Playwright drove 26 routes through the real UI + form validation/submit/persistence
- [ ] **ACTIVATION GATE (founder + lawyer, not done):** choose/stand up a backend that stores signups and can email/SMS at launch; update + lawyer-review Privacy/Cookie; confirm lawful basis + DPA — then set `PUBLIC_WAITLIST_ENDPOINT`. Until then notifications cannot send cross-device.

#### 2c — Launch readiness ⏳
- [x] **Sole active corridor: USA → Switzerland (`us-ch`)** — `published: true`; **founder human-gate approval recorded (ADR-0014, 2026-06-13)**. _Content approved; public go-live still blocked on the domain (below)._
- [ ] _(deferred)_ India → Germany (`in-de`) — parked WIP on `corridor/in-de`; resume after `us-ch`
- [ ] _(deferred)_ all other corridors until `us-ch` is published
- [ ] **USA → Western Europe + UK batch via agent teams (ADR-0016, 2026-06-13):** `us-de, us-fr, us-nl, us-ie, us-at, us-be, us-lu, us-gb`, on branch `corridor/us-weu-research`. Run 1 (research) — **COMPLETE 2026-06-13, 8 of 8 drafted** (`us-de` 14t/94c, `us-fr` 11t/111c, `us-nl` 10t/92c, `us-at` 11t/91c, `us-be` 7t/50c, `us-ie` 11t/84c, `us-gb` 13t/106c, `us-lu` 11t/104c = **732 claims, all UNVERIFIED, `published: false`**, sources captured per corridor). Full gate green (check 0 errors, 90 tests, build). _(us-gb + us-lu finished by two standalone agents after the team's sessions ended over a long pause; their sources were already captured.)_ Run 2 (verification) — **COMPLETE 2026-06-13**: 8 independent `fact-verifier` agents (one per corridor, separate sessions; two-agent rule), each re-fetched every source LIVE and confirmed it. **670/732 claims VERIFIED, 62 kicked back** (us-de 94/94 + us-gb 106/106 fully clean → publish-gate candidates; us-fr 107/111, us-lu 92/104, us-at 80/91, us-ie 78/84, us-be 41/50, us-nl 72/92). Zero content drift; full gate green (check/build/90 tests). The 62 kick-backs are sourcing precision (claim cited to an adjacent/generic page, or detail behind a JS quiz) — **a content-researcher re-sourcing follow-up** (re-point/trim, then re-verify), not fabrications. All corridors remain `published: false` pending the founder publish gate. Opus 4.8 throughout; sources captured/re-checked via the ADR-0017 snapshotter (local `curl`, browser UA).
- [x] **Re-sourced all 62 kicked-back claims** (content-researcher pass, 2026-06-13: re-pointed to the correct official page / trimmed to the source / recast as "confirm with [authority]" where no official source exists; 0 `# KICKED BACK` remain; build green). Still `status: UNVERIFIED` (re-pointed claims await re-check). _Note: us-nl leans on the EU Immigration Portal for IND-quiz-gated facts — re-verify to assess as primary source._
- [ ] **Re-verify the 62 re-sourced claims** (SEPARATE fact-verifier pass, two-agent rule) → then founder publish gate per corridor.
- [x] Compliance pages: privacy policy, cookie policy, terms — **drafted 2026-06-13** (`src/pages/privacy.astro`, `cookie-policy.astro`, `terms.astro`), clearly marked DRAFT with operator placeholders; **lawyer review + operator details still pending before launch**
- [x] Impressum — drafted (`src/pages/impressum.astro`); operator details + lawyer review pending
- [x] Contact / About page — **drafted 2026-06-13** (`about.astro`, `contact.astro`); contact email is a placeholder until the domain exists
- [x] SEO metadata + JSON-LD per corridor (seo-analyst) — corridor JSON-LD live (ADR-0011); **og:image social card + `summary_large_image` Twitter card added 2026-06-13** (`public/og/og-default.{svg,png}`, wired in `BaseLayout`)
- [x] Analytics + consent decision implemented (resolves **ADR-0004** → **ADR-0013**) — Plausible + GA4-behind-consent + AdSense all behind a reject-by-default consent banner (`ConsentBanner.tsx`); **dormant until `PUBLIC_*` env vars are set at launch** (nothing loads without a domain/IDs)
- [x] Founder approval of first corridor (human gate) — **ADR-0014, 2026-06-13** (`us-ch`)
- [ ] **Launch blockers remaining (infrastructural):** production domain + Cloudflare Pages deploy + `SITE_URL`; lawyer review of legal drafts; operator details for Impressum/Contact. Monetization groundwork documented in `docs/monetization.md` (AdSense not yet eligible — needs domain + ~15 pages).

### Phase 3 — Accuracy system 🔁 (ongoing from Phase 1)
The non-negotiable provenance rules — enforced continuously, not a one-off phase.
- [x] Provenance fields required at compile time; build gate at render time
- [ ] Two-agent verification practised on every corridor (researcher ≠ verifier)
- [x] `link-auditor` CI (2026-06-12): `scripts/check-links.mjs` + weekly `link-audit.yml` (also runs on PRs touching corridor content). Checks every claim sourceUrl: dead links/soft-404s/redirect-loops = red (opens a tracking issue); permanent redirects + content drift (sha256 baseline in `scripts/link-baseline.json`) = warnings. Handles fedlex SPA shells and the eda.admin.ch bot-block (manual-check allowlist). First run: **23/23 URLs OK, 0 errors**
- [x] Automated staleness flagging surfaced in CI (same job): past-due `reviewBy` = red; due within 14 days = warning; VERIFIED claims missing provenance = red. Earliest current reviewBy: 2026-07-09 (30-day fee claims start warning ~2026-06-25)
- **Source-snapshot cache + content-drift detection (ADR-0017):** spec'd + **core implemented 2026-06-13** (built by a 2-teammate agent team on Opus 4.8; 90 tests green). Local-first, git-tracked archive of the raw official source behind every claim, to prove "what the page said on date X" and detect *content* drift (not just dead links).
  - [x] `scripts/snapshot-source.mjs` — capture via local `curl` (dodges the gov-site datacenter block) → normalize (`scripts/lib/normalize-source.mjs`, deterministic) → sha256 → `sources/<corridor>/manifest.json` + tracked text extract; raw HTML gzipped in a gitignored `sources/.cache/`. Dedups by sha256, merges claimIds, writes nothing on fetch failure.
  - [x] Optional, back-compatible `sourceHash` on the `Claim` schema (Zod) + `tests/schema-sourcehash.test.ts`
  - [x] `scripts/check-sources.mjs` drift check folded into `link-audit.yml` (re-fetch → normalize → hash compare → OK/DRIFTED/UNREACHABLE). **v1 is informational/non-strict** (warnings + CI annotations); `--strict` exits non-zero.
  - [ ] _(deferred)_ per-claim drift severity (fees/quotas/eligibility drift = red vs. warning) — v1 treats all drift as a warning
  - [ ] Wire capture into the ADR-0016 **research**-team prompt; wire the live-refetch + diff into the **verification**-team prompt (verifier still re-fetches live — the cache never replaces the integrity check, preserving the two-agent rule)
  - [ ] Decide + apply backfill for `us-ch` (218 claims) vs. going-forward only

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
| USA (`us`) | ✅ 218/218 verified (work + family + retirement + study; ADR-0012 document checklists on all 21 tasks) — **founder-approved (ADR-0014)**; go-live blocked on domain | ⬜ |
| UK (`gb`) | ⬜ | ⬜ |
| Canada (`ca`) | ⬜ | ⬜ |
| Australia (`au`) | ⬜ | ⬜ |
| Philippines (`ph`) | ⬜ | ⬜ |
| China (`cn`) | ⬜ | ⬜ |

_Wave 2 origins (Serbia, Russia, Ukraine) and destinations added as those waves open._

---

## Pending decisions
- ~~**ADR-0004 (analytics & consent)**~~ — **resolved 2026-06-13 (ADR-0013):** founder approved Plausible + GA4-behind-consent; implemented dormant.
- **ADR-0005 schema additions** (`published`, `title`/`description`, `CategoryEnum`): implemented; awaiting founder confirmation.
- **Production domain / `site` URL:** placeholder until registered (affects canonical URLs + sitemap, and gates analytics/ads go-live).
- **Legal drafts (privacy/cookie/terms/Impressum):** drafted; need a human lawyer's review + operator details before launch.
