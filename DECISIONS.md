# DECISIONS.md — Architecture Decision Records

> Append-only. Never edit past decisions; supersede them with new entries.
> Format: ADR-NNNN | date | status | decision

---

## ADR-0001 — Framework & content architecture

**Date:** 2026-06-10
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
Building a relocation-guidance site covering origin→destination corridors. Primary constraints: (1) best possible SEO / Core Web Vitals for AdSense eligibility; (2) provenance-enforced data model (accuracy system); (3) solo operator budget; (4) existing React flowchart component to preserve.

### Decision
**Astro 4.x + React islands + Astro Content Collections (Zod schemas) + Tailwind CSS, deployed on Cloudflare Pages.**

### Rationale
- Astro ships zero JS by default → best Lighthouse scores → AdSense review easier → better organic ranking
- Zod content collection schema makes `sourceUrl` / `lastVerified` / `reviewBy` / `status` **required at compile time** — provenance cannot be omitted
- Build fails automatically on stale/unverified claims (QA gate)
- React island pattern preserves the existing `@xyflow/react` flowchart with no rewrite
- Cloudflare Pages: free tier, global CDN, trivial preview deploys, no server costs
- Astro built-in i18n routing: English-only at launch, expansion-ready

### Rejected alternatives
- **Next.js:** Heavier default JS payload; SSR runtime cost; better only if logged-in personalization is needed at launch (it isn't)
- **Gatsby:** Slower builds at scale; ecosystem maturity concerns
- **Plain React SPA (current prototype):** No SSG, poor SEO, no content model, no provenance enforcement

### Consequences
- Migration cost if server-rendered personalization is needed later → accepted risk
- Astro learning curve for future contributors → mitigated by CLAUDE.md docs

---

## ADR-0002 — Repository migration strategy

**Date:** 2026-06-10
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
Source code currently lives as a guest on a personal portfolio repo (`AnikaWilliams/AnikaWilliams.github.io`). The `.git` object store is 53 MB, inflated by: a 21 MB base64-embedded portfolio HTML file, 6 stale JS build bundles, and repeated large blobs of `germany.ts`/`switzerland.ts` as they grew.

### Decision
**Clean `git init` in a new dedicated repository, seeded only from the `relocation-app/src` tree on branch `claude/relocation-flowchart-9o6knk`.** No mirror of the old history.

### Rationale
- Zero personal-portfolio data in the business repo
- No stale build artifacts in git history
- Secret-free from commit #1 (full scan confirmed no secrets in old repo, but no reason to carry personal commit metadata into a business context)
- Resulting repo starts at ~200 KB, not 53 MB
- Old prototype commit log has no business value: it is ~90% portfolio commits interspersed with relocation work

### What is preserved
- All source files under `relocation-app/src/` (components, data, types, hooks, utils) — migrated verbatim
- `package.json`, `vite.config.ts`, `tailwind.config.js`, `tsconfig.json` — migrated and adapted for the new Astro setup
- Content data (`germany.ts`, `switzerland.ts`) — migrated as seed data through the researcher→verifier pipeline (not grandfathered in as verified — Phase 3 requires re-verification)

### Consequences
- Prototype commit history is not preserved → accepted; history lives in old repo if ever needed
- Existing data must pass through the accuracy pipeline before publishing → required by Phase 3 anyway

---

## ADR-0003 — Content scope: origin countries

**Date:** 2026-06-10
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Decision
**Wave 1 origins (with Switzerland + Germany destinations):** India, USA, UK, Canada, Australia, Philippines, China

**Wave 2 origins (with expanded destinations):** Serbia, Russia, Ukraine (Ukraine as dedicated temporary-protection track, not a standard skilled-relocation corridor)

### Data basis
- India: 192k EU permits 2024 (#2 origin); #1 EU Blue Card recipient (24%); 240k to UK. Clear anchor.
- Turkey: omitted from Wave 1 at founder preference despite #2 data ranking; added to Wave 2 if needed
- USA/Canada/Australia: lower raw flows but high-income Anglophone buyer cohort; strong ability scores
- UK: post-Brexit non-EU; significant EU-outbound interest; Anglophone
- Philippines: purpose-built bilateral health-worker channels (DE/AT/IE); high English; distinct feasibility story
- China: ~78k to UK; strong study→work pipeline; #3 EU permit origin for education
- Russia: #2 EU Blue Card origin (11%); sanction/banking blockers must be flagged prominently on all Russia-origin content
- Serbia: Germany's Western Balkans Regulation (no quota cap for skilled workers); largest WB economy
- Ukraine: 295k EU permits 2024 but driven by temporary protection → separate dedicated track

### Rejected from priority list
- Japan, South Korea: low EU-bound flow; lowest-tier English (EPI #92/#91); small content market
- Morocco, Egypt, Tunisia: real flows but Francophone/Maghreb-specific → revisit for French-destination wave
- Belarus: flow largely conflict-proxy-driven via Poland; not the target audience

---

## ADR-0004 — Analytics and consent

**Date:** 2026-06-10
**Status:** Pending founder decision before implementation

### Context
AdSense requires Google Consent Mode v2 in EEA/UK/CH. GA4 integrates natively. Plausible is privacy-friendlier but optimizes AdSense revenue less well.

### Options
1. **GA4 + CMP (Google Consent Mode v2)** — required for full AdSense revenue in EU/CH. More data, more privacy surface.
2. **Plausible Analytics** — GDPR-compliant by default, no consent banner needed, EUR 9/month. Loses some AdSense optimization signal.
3. **Both** — Plausible for site analytics (no consent friction), GA4 behind consent gate for AdSense signals.

### Recommendation
Option 3: Plausible primary + GA4 behind CMP consent gate. Minimises consent friction for pure traffic analytics while satisfying AdSense requirements.

**Decision:** ⏳ Awaiting founder approval before implementation.

---

## ADR-0005 — Phase 1 technical foundation: content layout & build gate

**Date:** 2026-06-09
**Status:** Accepted (implemented on `feat/phase-1-foundation`). Schema **additions** below flagged for founder confirmation.
**Decided by:** Founder (Anika Williams), implemented this session

### Context
Phase 0 delivered only governance docs. Phase 1 scaffolds the Astro 4.x application that implements ADR-0001 (framework) and the Phase 3 accuracy system. This ADR records the concrete decisions made while building the foundation, including necessary additions to the architect's draft schema.

### Decisions

**1. Content-collection layout.** Corridors are an Astro **data collection** (`type: 'data'`), one file per corridor under `src/content/corridors/`, named `{originIso2}-{destinationIso2}.yaml` (e.g. `in-de.yaml`). Adding a corridor = adding a file; zero code changes. This implements the CLAUDE.md "folder per corridor" intent as a flat file-per-corridor (simpler, same zero-code property).

**2. Schema split for testability.** The canonical Zod schema lives in `src/content/schema.ts` (imports the standalone `zod` package, no Astro runtime), and `src/content/config.ts` wires it into the collection. This lets the build gate and schema be unit-tested under Vitest without booting Astro.

**3. Build gate = render-time assertion.** `src/utils/provenance.ts` holds pure functions (`evaluateClaim`, `findCorridorViolations`, `assertCorridorPublishable`). The corridor page's `getStaticPaths` calls `getPublishedCorridors()`, which runs the gate on every published corridor and **throws during `astro build`** if any rendered claim has `status !== 'VERIFIED'` or a past `reviewBy`. This is the technical enforcement of CLAUDE.md rule 5 / qa-engineer's content-regression rule. Covered by `tests/provenance.test.ts`.

### Additions to the architect's draft schema (need founder confirmation)
- **`published: boolean` (default `false`)** on `CorridorSchema`. Drafts can live in the repo without tripping the gate; only `published: true` corridors render and are gated. This is the technical hook for the human approval gate (CLAUDE.md rule 8).
- **`title` / `description`** added to `CorridorSchema` (needed for page `<title>`, meta description, and the corridor index card).
- **`CategoryEnum`** concrete values defined (the draft referenced `CategoryEnum` without listing members): `visa-permit, employment, housing, finance-banking, healthcare-insurance, registration-bureaucracy, taxes, family-dependents, education, transport-logistics, language-integration, other`.
- A `VERIFIED` claim is treated as **not publishable** if it is missing `lastVerified`/`verifiedBy`, or if `reviewBy` is absent/past — stricter than the draft, matching the accuracy rules.

### Also fixed in this phase
- **Phase 0 scaffold defect:** `setup.py` wrote `gitignore` and `claude/agents/` with the leading dots stripped. Renamed to `.gitignore` (now active) and moved agent definitions to `.claude/agents/` (where Claude Code loads sub-agents). The `.gitignore` also now excludes `.claude/settings.local.json`.

### Consequences
- No real corridor content ships in Phase 1 (founder instruction); the corridors dir is empty but documented (`README.md`). The gate is proven by unit tests, not by fake data.
- `astro.config.mjs` `site` is a placeholder (`SITE_URL` env) until the production domain exists — must be set before launch for correct canonical URLs and sitemap.
- ADR-0004 (analytics) remains pending; no analytics/ads code added yet.

---

## ADR-0006 — Narrow initial focus to USA → Switzerland

**Date:** 2026-06-09
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
Phase 2 began with India → Germany (`in-de`). The founder has refocused: perfect a single corridor end-to-end before expanding to the rest.

### Decision
The **sole active corridor is USA → Switzerland (`us-ch`)**. All other corridors are deferred until `us-ch` is "perfected" — fully VERIFIED content, founder-approved, published, with SEO + compliance complete. India → Germany (`in-de`) is **parked as WIP** on branch `corridor/in-de` (currently not build-clean; 23/29 claims verified) and will resume later.

### Rationale
- Depth before breadth: prove the full researcher → verifier → publish pipeline on one corridor.
- Smaller verification surface → faster path to a genuinely trustworthy live page.
- USA → Switzerland is a strong test case: high-value Anglophone origin; Switzerland's non-EU/EFTA quota + cantonal rules exercise the hard parts of the model.

### Scope note
This narrows **immediate priority only**. The broader approved scope (ADR-0003 waves of origins/destinations) is unchanged for the long term — "once this is perfected we move on to the others."

### Consequences
- `corridor/in-de` stays parked (do not merge); revisit after `us-ch`.
- ROADMAP Phase 2 reorganised around `us-ch`.
- No code changes required — the architecture already supports any corridor by adding one content file.

---

## ADR-0007 — Optional timeline/cost fields in TaskSchema

**Date:** 2026-06-11
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
The us-ch corridor verification round produced 22 VERIFIED claims and 5 FLAGGED ones. All 5 FLAGGED claims are `timeline` or `cost` fields on tasks where no single official federal figure exists — these numbers are set at cantonal or communal level and vary. The verifier correctly FLAGGED them rather than publishing a misleading figure.

Options considered:
1. **Publish "Confirm with [authority]" as a claim** — requires a claim type exempt from the build gate, complicating the accuracy model.
2. **Make timeline/cost optional; omit when unverifiable** — smallest change; the build gate is unaffected.
3. **Add a new "varies by canton" meta-claim type** — larger schema surface, more maintenance.

### Decision
**Make `timeline` and `cost` optional fields in `TaskSchema`.** When no verifiable figure exists, the field is omitted from the corridor YAML. The corridor page renders timeline/cost sections only when both the field and its value are present.

### Rationale
- Accuracy rule preserved: no unverified or unverifiable figure is published.
- Build gate unchanged: absent fields are simply not collected by `collectClaims`.
- Smallest viable change: two `.optional()` calls in schema.ts, one guard in provenance.ts, conditional rendering in the corridor page.
- Users are better served by a missing field than a misleading "varies" figure.

### Consequences
- Tasks may now omit `timeline`, `cost`, or both; all other Task fields remain required.
- The corridor page must render gracefully when either field is absent (conditional render).
- Future corridors should document *why* a field is omitted (e.g. "cantonal/communal — no federal figure") in a YAML comment alongside the omission.
- The 5 previously FLAGGED claims are removed from us-ch.yaml; all 22 remaining claims are VERIFIED.

---

## ADR-0008 — Guided-form experience: retire the flowchart UI; expand the intake

**Date:** 2026-06-12
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
The corridor app shipped as a 3-step wizard followed by a visual dependency flowchart (`@xyflow/react`). A UX audit and founder review identified two problems: (1) the node-graph was the worst-performing surface (largest JS bundle, dead canvas space, unusable on mobile), and (2) the intake captured too little to personalise the path. The founder chose to reframe the whole product as a guided form rather than a diagram, and to expand intake to drive future path-filtering.

### Decision
1. **Retire the flowchart from the user-facing UI.** The dependency graph's logic (topological ordering, lock/unlock state) moves into a headless module, `src/utils/journey.ts`. The user now sees a one-task-at-a-time guided card plus a "journey + answer history" sidebar. `CorridorFlowchart.tsx` and `@xyflow/react` are no longer in the render path (left in-repo, pending removal).
2. **Expand the intake into a config-driven, branching wizard.** Steps are declared as data (`WizardStep[]` with `visibleIf`/`isComplete` predicates) so motivation-specific follow-ups (work / family / study / other) are added without routing changes. Page 1's single country button is split into separate origin and destination questions; a passports multi-select is added; intended-stay and children questions are retained.
3. **Country selection is gated by published corridors.** The wizard reads the published `{origin,destination}` pairs and makes only those countries selectable; unsupported countries render greyed-out and unselectable. Choosing a different published corridor navigates to that corridor's static route.
4. **Self-hosted SVG flags via individual `flag-icons` asset imports** (not the full stylesheet), to render flags identically on Windows (emoji flags fail there) with no third-party runtime request and minimal bundle cost.

### Rationale
- Removing `@xyflow/react` from the render path cut the island bundle from ~59 kB gz to ~9 kB gz and resolved the mobile blocker.
- A config-driven step list keeps the branching logic in one place and satisfies the "extensible mapping from motivation to follow-ups" requirement.
- Gating countries by published corridors prevents users from reaching unverified/empty corridors while still showing the roadmap of what's coming.
- Importing only the ~18 in-scope flag SVGs (vs the full `flag-icons` CSS) keeps CSS at ~17 kB and avoids shipping ~260 flags; greyed countries show an ISO chip rather than loading a flag image, avoiding the heavy Serbia flag on the intake screen.

### Consequences
- New modules: `src/utils/countries.ts` (framework-agnostic country data + display names, re-exported by `corridors.ts`), `src/utils/flags.ts` (per-country SVG asset map), `src/utils/journey.ts` (ordering + status). New dependency: `flag-icons`.
- The corridor route passes `originIso2`, `destinationIso2`, and `availableCorridors` to `CorridorApp` (previously pre-resolved display names).
- Intake answers are **captured but not yet consumed** by task-filtering (no `appliesIf` evaluation yet); EU/EFTA passport branching is explicitly deferred (capture-only). Wiring answers to the task path is the next ADR.
- `CorridorFlowchart.tsx` and `@xyflow/react` are unused and should be removed in a follow-up once the direction is confirmed stable.
- Intake state is persisted under a new `localStorage` key (`relocation-intake-v2`); the schema changed, so prior `relocation-wizard-v1` state is ignored.

---

## ADR-0009 — `appliesIf` evaluation: tiny expression grammar, fail-open

**Date:** 2026-06-12
**Status:** Accepted
**Decided by:** Architect (session), under founder direction to personalise the path

### Context
`Task.appliesIf` has existed in the schema since ADR-0005 ("expression evaluated at runtime") but nothing evaluated it — every task rendered for every user. The guided-form pivot (ADR-0008) captures rich intake answers expressly so the path can be personalised. We need an evaluator that is safe (corridor YAML is content, not code) and that can never hide a legally required step by accident.

### Decision
1. **A deliberately tiny expression grammar**, parsed by a hand-written tokenizer/evaluator in `src/utils/appliesIf.ts` — never `eval`/`new Function`. Supported: bare truthy test (`hasChildren`), negation (`!hasChildren`), `==`/`!=` against quoted strings or `true`/`false`, `includes` for list fields (`passports includes 'ch'`), combined with `&&`/`||` (no parentheses — split complex rules into separate tasks instead).
2. **Fail-open.** A malformed expression or unknown field name means the task **stays visible** (with a dev console warning). Showing an unneeded step is an annoyance; hiding a required one is catastrophic and would silently violate the accuracy promise.
3. **Evaluation context** is the flattened intake: `origin`, `destination`, `passports[]`, `motivation`, `workStatus`, `familyRelationship`, `familyJoineeStatus`, `studyStatus`, `durationIntent`, `hasChildren`.
4. **Authoring `appliesIf` rules is content-pipeline work.** Which situations a task applies to is a legal-accuracy judgement: rules are written by `content-researcher`, independently checked by `fact-verifier` against official sources, like any claim. No rules were added to `us-ch.yaml` in this change — the machinery ships first; today all 6 tasks apply to everyone, unchanged.
5. **Visible personalisation:** when any task is filtered out, the plan shows a "Personalised for you: N of M steps apply — skipped: …" banner, so users always see *that* and *what* was excluded.

### Consequences
- New module `src/utils/appliesIf.ts` + 9 unit tests (`tests/appliesIf.test.ts`), including fail-open cases.
- `CorridorApp` filters tasks through the evaluator before ordering; progress counts, completion state, and the journey sidebar operate on applicable tasks only. `doneIds` may retain excluded tasks (harmless; re-included if answers change back).
- The grammar is intentionally not extensible by content authors (no arbitrary code); extending it (e.g. parentheses, numeric comparison) requires an architect change here.
- EU/EFTA passport branching remains deferred — `passports includes` makes it expressible once the free-movement content track exists (verified content is the blocker, not machinery).

---

## ADR-0010 — Corridor route-coverage metadata and the honest-mismatch notice

**Date:** 2026-06-12
**Status:** Accepted
**Decided by:** Architect (session), prompted by founder bug report

### Context
The founder completed the intake as a family-route user (joining an unmarried partner) and was recommended "Secure an employer-sponsored work and residence permit" — presented under a "Your personalised relocation plan" heading. The us-ch corridor's verified content covers only the employer-sponsored work route, and with no `appliesIf` rules yet (ADR-0009), every user gets that plan regardless of answers. Showing the wrong route *as if personalised* is a trust failure of exactly the kind CLAUDE.md exists to prevent.

### Decision
1. **Corridors declare coverage.** New optional `coversMotivations: Motivation[]` field on `CorridorSchema` (with a shared `MotivationEnum`: work/family/study/other). `us-ch.yaml` sets `[work]` — this restates the corridor's own verified description ("…relocate to Switzerland for work"), not a new factual claim. Omitted field = no coverage check (legacy behaviour).
2. **Honest mismatch UX.** When the user's motivation falls outside coverage: (a) an inline note appears immediately on the wizard's motivation step ("we haven't verified the family route yet…"); (b) the plan header reads "Work route guide — your route isn't covered yet" instead of "Your personalised relocation plan"; (c) a prominent notice explains the steps describe the covered route and may not match, "treat them as background reading, not your plan". The personalised-skip banner (ADR-0009) is suppressed in this state.
3. **The plan is shown, not hidden.** The covered-route content is still legitimate verified information; we label it honestly rather than blanking the page.

### Consequences
- Schema gains `MotivationEnum` + optional `coversMotivations`; the wizard's motivation values must stay in sync with the enum.
- Each new route a corridor gains (via researched + verified content and `appliesIf` rules) adds its motivation to `coversMotivations`, which retires the notice for those users automatically.
- The intake keys (`work`/`family`/`study`/`other`) are now load-bearing across schema, content, and UI.

---

## ADR-0011 — Corridor pages: app hero + always-visible indexable guide (progressive enhancement)

**Date:** 2026-06-12
**Status:** Accepted
**Decided by:** Founder (approved the recommended combo), implemented by architect session

### Context
The seo-analyst audit (2026-06-12) found the corridor page's verified content existed only as serialized island props — not crawlable markup. Its interim fix (JSON-LD + a `<noscript>` guide) didn't solve indexing: Googlebot executes JavaScript and indexes the rendered DOM, which was still just the wizard, and noscript content carries little weight. For a business that depends on organic search, an app-shell-only money page is a structural risk.

### Decision
1. **Corridor pages are normal scrollable documents again.** The `fullBleed` layout no longer locks the body to `h-screen`; it now only hides the marketing header. The interactive app sits in a **viewport-height hero wrapper** (`h-screen` with an inline `100dvh` override) and keeps all its internal scrolling.
2. **The complete guide renders below the app as real, always-visible markup** (`<section id="full-guide">`): every task with summary, detail, steps, documents, timeline/cost, warnings, per-claim sources and last-verified dates, plus the canonical disclaimer. Built 1:1 from the same VERIFIED corridor data the app receives — zero hand-written facts. Headings: sr-only `h1` (page) → `h2` (guide) → `h3` (tasks) → `h4` (subsections).
3. **The old `<noscript>` overlay is replaced** by a one-line noscript banner pointing to the guide (the guide itself no longer needs a JS-off variant — it's always there).
4. **The site footer now renders on fullBleed pages too**, making Impressum/legal links reachable from corridor pages (closes the compliance review's availability defect at the layout level).
5. **"Copy link to this plan"** button in the plan sidebar with the compliance-required pre-share warning; clipboard failure falls back to a prompt showing the URL.

### Rationale
- Crawlers index what renders: the guide is now genuinely visible content for every visitor — identical HTML to all user agents, no hidden-text or cloaking pattern.
- Users gain a skimmable long-form version of the plan (useful for printing, ctrl-F, reading before committing to the wizard).
- The app experience is unchanged above the fold; the page simply continues below it.

### Consequences
- `BaseLayout`'s `fullBleed` contract changed: no viewport lock, footer always shown. Any future fullBleed page gets a scrollable document with footer by default.
- The corridor page now ships ~2× the HTML (guide markup is real instead of noscript-inert); zero added JS.
- Verified in the hydrated DOM: guide section visible with all 12 task headings and sources while the app stays interactive above it.
- The guide section renders ALL corridor tasks (not filtered by `appliesIf`) — correct for a reference document; the app remains the personalised view.
