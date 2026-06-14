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

---

## ADR-0012 — Document substeps + scannable task detail (founder request, 2026-06-12)

**Date:** 2026-06-12
**Status:** Accepted (machinery); content pending the pipeline + founder preview

### Context
Founder request: (1) each journey step should expand into checkable document substeps (user-supplied documents vs official forms, with deep links to the issuing authority), gating step completion; (2) the task detail panel is too text-dense — restructure as short summary + scannable key facts + collapsed full prose.

### Decision
1. **Schema** (`schema.ts`): `TaskDocumentSchema` — `{ name, type: 'provide' | 'form', description, form?: Claim }`, with `form` REQUIRED for type `form`. **Form links are full Claims**: `sourceUrl` = the authority's current link, `sourceName` = issuer (e.g. "SEM", "Canton de Vaud — SPOP"), standard provenance fields. This means form links are automatically (a) two-agent verified, (b) blocked by the build gate when unverified/stale, and (c) watched weekly by link-auditor. We never self-host official PDFs; when a deep link can't be confirmed current, the claim points at the authority's forms index and says so. `Task.documents` becomes `(string | TaskDocument)[]` — legacy strings remain valid (rendered as 'provide' items) so migration is per-corridor, not big-bang.
2. **Schema**: `Task.tldr?: Claim` (1–2 sentence distilled summary) and `Task.keyFacts?: (Claim & {label})[]` (3–5 scannable facts). Both claim-grade: distilled copy is still factual assertion, so it goes researcher → verifier like everything else. UI falls back to the verified `summary` when `tldr` is absent; the verified `timeline`/`cost` claims auto-append to the Key facts grid (researchers must not duplicate them in `keyFacts`).
3. **Gate** (`provenance.ts`): `collectClaims` now collects `tldr`, `keyFacts[]`, and `documents[].form` (tests added).
4. **UI** (`CorridorApp.tsx`): document checklist in both the sidebar (compact, expandable per step, auto-expands the active step, "n/m" chip) and the detail panel (full: descriptions, "Get form from {issuer}" new-tab link with "link verified {date}" caption, per-document **Skip** for conditional items). Checked/skipped state persists in localStorage (`docState`) — deliberately NOT in share URLs (progress is personal; the F-08 fragment stays answers-only). **A step cannot be marked done while documents remain unhandled** (done or skipped); the button disables with an explanation. Detail panel order: tldr → Key facts grid → warning → "Read the details" `<details>` accordion (closed; holds the long summary + detail prose) → steps → document checklist → sources/disclaimers (unchanged).

### Content rule (unchanged, restated)
WHICH documents a step requires, per SEM / Canton de Vaud guidance, is factual content: drafted by content-researcher with official sources, independently verified, founder-approved. The machinery ships first; document lists and distilled tldr/keyFacts copy land as UNVERIFIED drafts and go through the standard pipeline before rendering.

### Consequences
- `documents` strings and structured entries coexist; the corridor page maps both shapes into the island and the indexable guide section.
- Per-task doc progress is derived state (no schema for "checked" — it's user-local).
- Renaming a document in content resets users' checkmarks for that item (key = task id + doc name) — acceptable; names are stable post-verification.
- The all-done completion screen is now genuinely earned: every applicable task's documents were handled first.

---

## ADR-0013 — Analytics, consent & advertising: approval + dormant implementation

**Date:** 2026-06-13
**Status:** Accepted — resolves the pending decision in **ADR-0004**
**Decided by:** Founder (Anika Williams) approved Option 3; implemented this session

### Context
ADR-0004 left the analytics/consent choice "pending founder decision" with a recommendation of Option 3 (Plausible primary + GA4 behind a consent gate). The founder approved that option and asked to also begin monetization groundwork. The site has **no production domain yet** and far fewer than AdSense's content-volume threshold, so nothing can actually go live — but the consent and analytics plumbing can ship now, dormant, so launch is a config change rather than a build.

### Decision
1. **Approve ADR-0004 Option 3.** Plausible (cookieless, no consent prompt) is the primary analytic; **GA4 loads only behind explicit consent**. Advertising (Google AdSense) is added to the same consent gate for post-launch.
2. **Dormant by default.** All provider IDs are read from `PUBLIC_*` build env vars (`PUBLIC_PLAUSIBLE_DOMAIN`, `PUBLIC_GA4_ID`, `PUBLIC_ADSENSE_CLIENT`) that default to empty. With empty config **nothing loads — not even after a visitor clicks "Accept"** (`src/utils/analytics.ts` guards every loader on a non-empty ID). Safe to ship pre-launch; documented in `.env.example`.
3. **Consent model** (`src/components/ConsentBanner.tsx`, compliance-owned behaviour): optional categories default OFF (reject-by-default, no pre-ticked boxes); "Accept all" and "Reject non-essential" have equal prominence; granular per-category toggles via "Customise"; choice persisted to `localStorage` key `rg-consent-v1` (versioned — a bump re-asks); withdrawable/changeable any time via the footer **"Cookie settings"** link (dispatches a window event the island listens for). Hydration-safe: renders nothing until mounted, reads storage only in an effect.
4. **Event taxonomy is coarse and non-personal.** `trackEvent(name, props)` carries only enums (corridor, motivation, step index, task id, booleans) — **never** free-text intake, passports, or employer/institution names. Full taxonomy in `docs/monetization.md` §2. Wiring the specific calls into `CorridorApp` is deferred to land with a live endpoint.
5. **Advertising strategy (groundwork).** Ads will be **AdSense only**, serving **only post-launch**, **only behind the advertising consent toggle**, **never adjacent to legal/visa claims, document checklists, official-source links, or the disclaimer**, within a CWV budget (reserved slot sizes, lazy below-the-fold). Activation gated on: live domain + ~15 indexable pages + AdSense approval + `PUBLIC_ADSENSE_CLIENT` set. Placement plan in `docs/monetization.md` §3.

### Consequences
- New: `src/utils/analytics.ts`, `src/components/ConsentBanner.tsx`, `docs/monetization.md`; `.env.example` documents the three optional `PUBLIC_*` vars. `BaseLayout` mounts the banner (`client:load`) and the footer gains a "Cookie settings" trigger.
- Legal drafts updated to match: `privacy.astro`, `cookie-policy.astro` (storage inventory), `terms.astro` — all DRAFT pending human lawyer review (CLAUDE.md compliance scope).
- The consent UI is live and functional now, but **measures/serves nothing** until the env vars are populated at launch. Verified in-browser: reject persists & loads nothing; accept persists & still loads nothing (no IDs configured).
- ADR-0004's pending status is resolved here; its text is left intact (append-only).

---

## ADR-0014 — USA → Switzerland: founder human-gate publication approval

**Date:** 2026-06-13
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
CLAUDE.md rule 8 (human gate): "the founder personally approves the first version of every corridor before it goes live." The `us-ch` corridor is content-complete: 21 tasks, 218/218 claims VERIFIED via the two-agent pipeline, document checklists + key facts on every task (ADR-0012), the indexable guide (ADR-0011), route-coverage honesty (ADR-0010), and `published: true`. The founder reviewed the launch-readiness checklist and approved publication.

### Decision
**The founder approves the first published version of `us-ch`.** This records the human gate required by CLAUDE.md rule 8. The corridor remains `published: true`; the build gate continues to enforce that every rendered claim stays VERIFIED and in-date (a future stale/flagged claim will fail the build regardless of this approval).

### Scope / caveats
- Approval is of the **content's first version**, not a go-live: the site cannot actually launch until the production domain + Cloudflare Pages deploy exist (ROADMAP 2c) and `SITE_URL` is set. Canonical URLs/sitemap/og use the placeholder domain until then.
- Legal pages remain DRAFT pending human lawyer review; Impressum awaits operator details. These do not block content approval but **do** block public launch.

### Consequences
- The human gate for `us-ch` is satisfied and dated. Subsequent material content changes to `us-ch` should be re-approved.
- Remaining launch blockers are infrastructural (domain, lawyer review, operator details), tracked in ROADMAP Phase 2c.

---

## ADR-0015 — Launch waitlist for not-yet-live corridors (dormant capture)

**Date:** 2026-06-13
**Status:** Accepted (UI + capture). **Activation of off-device sending is DEFERRED to a founder decision.**
**Decided by:** Founder request (make every country selectable; capture interest for routes that aren't live) + main thread (architecture).

### Context
The intake previously greyed out every country outside a published corridor, so only USA→Switzerland was reachable. The founder asked to (a) make **all** countries selectable and (b) when a chosen route has no published guide, capture an email/phone to notify the person when it launches. This is a static site (Astro → Cloudflare Pages) with **no backend, no database, no production domain, and no email/SMS provider**, and the just-shipped Privacy policy states intake answers never leave the browser. Actually *sending* a launch notification requires backend infrastructure, a sending provider, a lawful basis, and a Privacy/Cookie update with lawyer review — all founder-owned and infrastructural.

### Decision
1. **Every country is selectable** in the origin and destination grids (no disabled/greyed options; nothing preselected on first open; no per-country availability badge — availability is revealed after selection). The route-live predicate lives in one pure, unit-tested helper (`src/utils/routes.ts`, `isRouteLive`).
2. **Waitlist phase.** Completing the intake for a non-published origin→destination pair routes to a dedicated waitlist screen (never a 404) that states plainly the guide isn't built yet and captures an **email (required) + phone (optional)** behind an **explicit, unticked consent** checkbox linking the Privacy policy.
3. **Dormant by default** — mirrors the analytics gate (ADR-0013). With `PUBLIC_WAITLIST_ENDPOINT` empty (the default), a signup is recorded **only in the visitor's own browser** (`rg-waitlist-v1`) and **nothing is transmitted off-device**, so the Privacy policy's "your answers stay in your browser" remains true. Set the endpoint to activate transmission.
4. **Coarse payload only.** When transmission is enabled, the body is route (origin/destination) + motivation + the contact details the visitor typed — **never** free text (employer / institution / "other"), matching the analytics hard-rule.

### Activation gate (founder + compliance — NOT yet done)
Before `PUBLIC_WAITLIST_ENDPOINT` may be set in production:
- choose + stand up a backend that stores signups and can email/SMS at launch (e.g. a Cloudflare Pages Function + KV/D1, or a form/ESP provider);
- update the Privacy + Cookie policies with the provider, retention, and rights, and have a **lawyer review** them;
- confirm the lawful basis (the unticked consent box is the opt-in) and a data-processing agreement with the provider.
Until then the feature is honest plumbing: it captures intent on-device and demonstrates the full UX, but cannot notify cross-device.

### Consequences
- Demand for unbuilt corridors becomes visible/capturable the day a backend is wired, with no UI rework — turning it on is a config + endpoint change.
- No PII leaves the device in the default deployment, so the privacy posture is unchanged until the founder deliberately activates it.
- Verified: 79 unit tests (incl. an exhaustive 324-pair origin×destination matrix asserting only us→ch is live); Playwright drove 26 routes through the real UI (live control → plan; all others → waitlist) plus the form's validation, submit, and on-device persistence.

---

## ADR-0016 — Corridor production via agent teams, in two separate runs (research, then verification)

**Date:** 2026-06-13
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
`us-ch` is content-complete and founder-approved (ADR-0014), so corridor production can scale beyond it. Claude Code **agent teams** (multiple independent Opus-4.8 sessions coordinating via a shared task list) let us parallelise that work. But CLAUDE.md's **two-agent rule** requires that the agent which *writes* a claim and the agent which *verifies* it be **different sessions with no shared context** — and within a single team, teammates share a task list and mailbox.

### Decision
Corridor content is produced with agent teams, split into **two separate runs / sessions** so the two-agent rule holds by construction (zero shared context between writer and verifier):

1. **Research run** — a team of `content-researcher` teammates (Opus 4.8) drafts each corridor YAML. Every claim is tagged `status: UNVERIFIED` with `sourceUrl`/`sourceName`, and the corridor stays `published: false`. **No verification happens in this run.**
2. **Verification run** — a *separate, later* team of `fact-verifier` teammates (Opus 4.8) independently re-derives each claim from its primary official source and flips it to `VERIFIED` (or kicks it back). Because it is a distinct session, the verifier shares no context with the writer beyond the claim text + cited URL in the YAML.

**This session's batch (research run):** USA → all in-scope Western-European destinations + UK — `us-de, us-fr, us-nl, us-ie, us-at, us-be, us-lu, us-gb`. (`us-ch` is already complete and serves as the quality template.)

### Required follow-up (do not skip)
**Research alone does not produce publishable content.** A **verification team run is mandatory** before any claim is marked `VERIFIED` or any corridor is set `published: true`. Until that run completes, every corridor in this batch remains `UNVERIFIED` and `published: false`.

### Constraints carried
- Opus 4.8 only (`content-researcher`/`fact-verifier` are pinned to it); never Fable 5 for this work.
- Every claim needs a primary official source. Agent `WebFetch` is datacenter-IP-blocked on government sites (confirmed `*.admin.ch`/`ch.ch`; assume the same risk elsewhere) → fetch with local `curl` via Bash; if a source is unreachable, the claim stays `UNVERIFIED` ("confirm with [authority]" + link), never inferred.
- One teammate per corridor file (no concurrent edits to one file); the lead serialises writes to shared files (VERIFICATION_LOG.md, ROADMAP.md, FOUNDER-TLDR.md).
- The build gate is unaffected — unpublished drafts don't trip it. Never merge to `main`/`develop`; the founder flips `published: true` after human review.

### Consequences
- Parallel throughput on corridor drafting; the two-agent rule is preserved by separation of runs rather than by in-team discipline.
- Verification is the gating step and is bound by official-source reachability (the `curl` path), so it is expected to be the slower of the two runs.

---

## ADR-0017 — Source-snapshot cache + content-drift detection (audit trail for verified claims)

**Date:** 2026-06-13
**Status:** Accepted (spec). **Implementation pending** — see ROADMAP Phase 3.
**Decided by:** Founder (Anika Williams)
**Owner:** `architect` (design) → `link-auditor` (CI integration)

### Context
Today we persist the *conclusions* of research — each claim's `status`/`sourceUrl`/`lastVerified`/`verifiedBy`/`reviewBy` live in the corridor YAML, with `VERIFICATION_LOG.md` as the audit record. We do **not** persist the *raw source content*. Consequences:
- Every research and every verification run re-fetches the same official pages from scratch (the two-agent rule deliberately makes the verifier re-fetch live — that part stays).
- The only raw captures that exist are ad-hoc, untracked session dumps (`audit/fetch-20260612/`, `audit/verify-study-20260612/`), created to work around the agent-WebFetch datacenter-IP block.
- We cannot prove **what an official page said on the day we verified a claim** — a real gap for content people make legal decisions from.
- `link-auditor` (`scripts/check-links.mjs` + `scripts/link-baseline.json`) checks URL *liveness* and a sha256 *baseline*, but it is not a per-claim, dated content archive.

### Decision
Build a **local-first, git-tracked source-snapshot cache** that captures the raw official-source content behind every claim, indexes it, and powers content-drift detection — without weakening the two-agent rule.

**1. Storage layout (per corridor)**
```
src/content/corridors/<corridor>.yaml          # unchanged (claims + provenance)
sources/<corridor>/manifest.json               # TRACKED — index (see below)
sources/<corridor>/<sha256-prefix>.txt         # TRACKED — normalized text extract
sources/.cache/<sha256>.html.gz                # GITIGNORED — raw payload (regenerable)
```
- **Tracked, small, diffable:** the `manifest.json` index + a **normalized plain-text extraction** of each source (whitespace-collapsed, boilerplate-stripped) — this is the legally-relevant content and is what drift compares.
- **Gitignored, regenerable:** the raw HTML/PDF, gzipped, keyed by content hash — fast local reuse within a run; not committed, to keep the repo lean.
- **Dedup:** keyed by normalized URL; identical content (same sha256) stored once; one source can back many claims.

**2. Manifest entry shape**
```jsonc
{
  "sourceUrl": "https://…",          // normalized (canonical)
  "sourceName": "…",                 // issuing authority
  "claimIds": ["task.cost", "…"],    // claims that cite this source
  "fetchedAt": "2026-06-13",
  "fetchMethod": "curl",             // curl (preferred) | webfetch
  "sha256": "…",                     // hash of the NORMALIZED text
  "byteSize": 12345,
  "contentType": "text/html",
  "textPath": "sources/<corridor>/<sha>.txt",
  "capturedBy": "<agent/teammate or human>"
}
```

**3. Capture path (dodges the datacenter block).** A helper `scripts/snapshot-source.mjs <url> <corridor>` fetches via local `curl` (residential IP), normalizes → text, hashes, writes the raw `.gz` to the gitignored cache and the text + manifest entry to the tracked tree. Falls back to WebFetch only for non-blocked sites. If a source is unreachable, it records nothing and signals the caller (claim stays `UNVERIFIED`).

**4. Schema change (back-compatible).** Add an **optional** `sourceHash` (sha256 of the normalized source text at last verification) to the `Claim` schema. Absent = "no snapshot yet" (existing `us-ch` claims keep building). When present, the build/CI can cross-check the rendered claim's hash against the tracked snapshot.

**5. Two-team integration (preserves the two-agent rule — ADR-0016).**
- **Research run:** after curl-fetching a source, the researcher snapshots it (raw→cache, text+hash→manifest). Claims stay `UNVERIFIED`.
- **Verification run:** the verifier **still re-fetches the source LIVE** and re-derives the claim — it does **not** trust the research snapshot as evidence. It then **diffs** its live fetch against the research snapshot:
  - identical / immaterially different + source supports the claim → `VERIFIED`, write `sourceHash`, refresh the manifest's verified snapshot;
  - **materially different** (page changed between research and verify) → flag for human/re-research, claim stays `UNVERIFIED`.
  The cache is an audit trail and a drift signal, **never** a substitute for the live integrity check.

**6. Drift detection (CI).** Extend the auditor with `scripts/check-sources.mjs` (or fold into `link-audit.yml`): for each tracked source, re-fetch live, normalize, hash, compare to the stored `sha256`/`sourceHash`. Content drift → warning by default; for claims tagged sensitive (fees/quotas/eligibility) → red, flips dependent claims toward re-verification (complements the existing `reviewBy` staleness gate). This is a real upgrade over the liveness-only `link-baseline.json`.

### Non-goals
- **Not** a runtime/site cache — the site stays static and never fetches sources at build or runtime.
- **Not** an external database or service (no domain/infra dependency; local-first, git-tracked).
- **Not** a replacement for live verification — the verifier always re-fetches live.

### Consequences
- Eliminates redundant re-fetching *within* a research run and gives a dated, per-claim **audit trail** ("what the source said on date X") — directly supports the "as if a lawyer will audit it" standard.
- Real **content-drift detection**, not just dead-link detection.
- Resilient to the datacenter-IP block (snapshots captured via local curl).
- Costs: some repo growth (bounded — text-only tracked, raw gzipped + gitignored, dedup by hash); new tooling to maintain; one optional schema field (back-compat); a normalization routine whose output must be stable (so hashes don't churn).

### Open questions / tunables (decide at implementation)
- **Track raw too?** Default: text + hash tracked, raw gzipped + gitignored. If legal review wants immutable raw archival, escalate to git-lfs or an external object store, and/or add PDF/screenshot capture for the highest-stakes claims.
- **Drift severity:** warn-vs-fail threshold by claim sensitivity (proposed: fees/quotas/eligibility = fail).
- **Backfill:** snapshot `us-ch`'s existing 218 claims, or only apply going forward to the USA→Western-Europe batch (ADR-0016)?
- **Normalization spec:** exact text-extraction rules (must be deterministic across runs/OSes to keep hashes stable).
- **Privacy:** sources are public official pages (no PII) → safe to commit; the snapshotter must refuse anything behind auth or containing personal data.

### Implementation tasks (for ROADMAP)
1. `scripts/snapshot-source.mjs` (capture: curl → normalize → hash → manifest/text/raw-gz) + `.gitignore` for `sources/.cache/`.
2. Optional `sourceHash` on the `Claim` schema (Zod), back-compatible.
3. `scripts/check-sources.mjs` drift check wired into `link-audit.yml`.
4. Wire capture into the ADR-0016 research-team prompt and the diff into the verification-team prompt.
5. Decide + apply backfill for `us-ch`.

---

## ADR-0018 — Publish 7 USA → Western-Europe corridors (founder human gate) + intake availability dots

**Date:** 2026-06-13
**Status:** Accepted
**Decided by:** Founder (Anika Williams)

### Context
The USA → Western-Europe + UK batch completed the full two-agent pipeline (ADR-0016): research → verify → re-source → re-verify. **7 of 8 corridors are 100% VERIFIED** — `us-de` (94), `us-fr` (111), `us-be` (50), `us-ie` (84), `us-lu` (104), `us-at` (91), `us-gb` (106). `us-nl` is 90/92, with 2 claims open on a genuine legal-deadline conflict in `health-insurance-zvw` (Zvw 4-month deadline stated two ways by two official sources — arrival-based vs permanent-permit-based), awaiting human/lawyer reconciliation.

### Decision
The founder approves publishing the **7 fully-verified corridors** (`published: true`): `us-de, us-fr, us-be, us-ie, us-lu, us-at, us-gb`. This records the CLAUDE.md rule-8 human gate for each. **`us-nl` stays `published: false`** until its Zvw deadline conflict is reconciled and re-verified. (`us-ch` was already published — ADR-0014.) The build gate independently confirmed all 8 published corridors are fully VERIFIED and in-date (`astro build` renders 15 pages, zero gate failures).

Also: the intake survey now shows a small **availability dot** per country — **green** when a published, verified corridor exists for that route, **gray** otherwise — driven by the published set (`getPublishedCorridorPairs` → `CorridorApp.tsx`). Origin grid: green on origins heading a published corridor; destination grid: green on destinations with a published corridor from the chosen origin.

### Scope / caveats
- Approval is of each corridor's **first published version**, not public go-live. The site still isn't deployed — public launch remains blocked on the production domain + Cloudflare Pages deploy (`SITE_URL`) and a **human lawyer's review of the legal pages**, same as `us-ch` (ADR-0014).
- "confirm with [authority]" claims in these corridors were **verified as honest gaps** where no official source publishes the detail (per-bank onboarding docs, US-person tax specifics) — acceptable to publish (CLAUDE.md rule 1), not fabricated.
- `us-nl` is intentionally held; do not publish until the Zvw conflict is resolved.

### Consequences
- 8 corridors now render (`us-ch` + 7); the intake offers them as live routes with green dots; the catalogue crosses ~15 indexable pages (relevant to AdSense eligibility — see `docs/monetization.md`).
- Subsequent material content changes to any published corridor require re-approval; `us-nl` and future corridors continue via the same gated pipeline.
