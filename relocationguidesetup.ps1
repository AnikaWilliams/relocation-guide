# Run this entire script in PowerShell inside your cloned relocation-guide folder

@'
# CLAUDE.md — Relocation Guide Project

> Every Claude Code session MUST read this file before acting.
> Every session MUST also check open GitHub Issues before acting.
> If this file contradicts what the current conversation says, this file wins — update it to resolve the conflict.

---

## What this product is

A website guiding people relocating from non-EU countries to Western European countries.
Content is keyed by **origin country → destination country corridors**.
Users make legal, financial, and life-altering decisions from this content.
**Treat every page as if an immigration lawyer will audit it.**

---

## Non-negotiable accuracy rules (Phase 3)

1. **No claim without a primary official source.** If no official source exists, write "confirm with [official body]" + link. Never publish an unsourced claim.
2. **Two-agent rule.** The agent that *writes* a claim and the agent that *verifies* it must be different sessions with no shared context.
3. **Every claim has provenance fields** (see data model below): `sourceUrl`, `lastVerified`, `verifiedBy`, `reviewBy`, `status`.
4. **Expired claims are automatically flagged.** Default review window: 90 days. Fees and quotas: 30 days.
5. **Build fails** if any rendered claim has `status !== 'VERIFIED'` or `reviewBy` is in the past.
6. **Visible provenance:** every page shows its sources and last-verified date to users.
7. **Disclaimer system:** every page has a clear "informational only, not legal advice" notice. `compliance-officer` owns the wording.
8. **Human gate:** the founder personally approves the first version of every corridor before it goes live.

---

## Repository structure

```
relocation-guide/
├── CLAUDE.md              ← this file
├── DECISIONS.md           ← ADR log; append-only
├── VERIFICATION_LOG.md    ← per-claim verification record
├── .claude/
│   └── agents/            ← sub-agent definitions
├── src/
│   ├── components/        ← Astro + React island components
│   ├── content/
│   │   └── corridors/     ← {origin}-{destination}/ folders
│   │       └── in-us/     ← example: India → USA (wrong — see below)
│   │       └── in-de/     ← India → Germany
│   │       └── in-ch/     ← India → Switzerland
│   ├── layouts/
│   ├── pages/
│   └── utils/
├── public/
└── astro.config.mjs
```

**Corridor folder naming:** `{ISO2-origin}-{ISO2-destination}` e.g. `in-de` (India→Germany), `us-ch` (USA→Switzerland). Adding a new corridor = adding a folder. Zero code changes required.

---

## Data model — every factual claim

```typescript
interface Claim {
  text: string;               // The claim as it appears on the page
  sourceUrl: string;          // Official primary source URL
  sourceName: string;         // Human-readable authority name
  lastVerified: string;       // ISO date: when verifier confirmed
  verifiedBy: string;         // Agent session or human reviewer
  reviewBy: string;           // ISO date: must be re-verified before this
  status: 'UNVERIFIED' | 'VERIFIED' | 'FLAGGED' | 'STALE';
}
```

**Status lifecycle:**
- Researcher creates claim → `UNVERIFIED`
- Verifier confirms → `VERIFIED`
- Past `reviewBy` → automated flag → `STALE` (build fails)
- URL 404 / content drift → `FLAGGED` (build fails)

---

## Branch model

| Branch | Purpose |
|---|---|
| `main` | Production. Protected. Only merged from `develop` via reviewed PR. |
| `develop` | Integration branch. All feature PRs target here. |
| `corridor/{name}` | Per-corridor content branches, e.g. `corridor/in-de` |
| `feat/{name}` | Feature/infrastructure branches |
| `fix/{name}` | Bug fixes |
| `agent/{task}` | Branches created by sub-agents for atomic tasks |

**You (Claude) never push directly to `main` or merge autonomously to `main`.**
The founder reviews and merges `develop → main`.

---

## Standard content pipeline

```
content-researcher  →  fact-verifier  →  frontend-engineer  →  compliance-officer  →  qa-engineer  →  [founder review]  →  merge
```

- Researcher writes, tags all claims `UNVERIFIED`
- Verifier re-checks every claim independently; tags `VERIFIED` or kicks back
- Frontend renders only `VERIFIED` content
- Compliance reviews disclaimer, privacy, jurisdiction flags
- QA runs tests, a11y, content-regression check
- Founder approves first version of each corridor
- Merge to `develop` (never directly to `main`)

---

## Sub-agent roster

See `.claude/agents/` for full definitions. Summary:

| Agent | Owns | May NOT touch |
|---|---|---|
| `architect` | ADRs, data model, repo structure | Content, UI styling |
| `content-researcher` | Draft corridor content | Verification, UI code |
| `fact-verifier` | Verification of claims | Writing new claims |
| `link-auditor` | Link-checking CI | Content |
| `frontend-engineer` | UI from approved designs | Content copy, facts |
| `seo-analyst` | Metadata, schema, CWV | Legal, content facts |
| `compliance-officer` | Privacy, disclaimers, legal notices | Technical decisions |
| `qa-engineer` | Tests, a11y, content regression | Content, styling |
| `revenue-analyst` | AdSense, analytics, reporting | Technical, content |

---

## Tech stack (ADR-0001, approved 2026-06-10)

- **Framework:** Astro 4.x (zero-JS default for SEO/CWV)
- **Interactivity:** React islands (`@astrojs/react`) — flowchart component
- **Content:** Astro Content Collections + Zod schemas (provenance enforced at compile time)
- **Styling:** Tailwind CSS
- **Hosting:** Cloudflare Pages
- **Analytics:** GA4 (subject to CMP gate) — Plausible as privacy-friendly alternative (see DECISIONS.md)
- **i18n:** Astro built-in i18n routing (English-only at launch)

---

## Approved content scope

### Destinations (Western Europe — in launch order)
Wave 1: Switzerland, Germany
Wave 2: France, Netherlands, UK, Ireland
Wave 3: Austria, Belgium, Luxembourg + rest of Western Europe

### Origin countries (approved 2026-06-10)
Wave 1: India, USA, UK, Canada, Australia, Philippines, China
Wave 2: Serbia, Russia*, Ukraine (protection track — separate from standard corridors)
*Russia: sanction/banking blockers must be prominently flagged on all Russia-origin content.

---

## Compliance scope

- GDPR (EU destinations + EU visitors)
- Swiss revised FADP
- UK GDPR / PECR
- CCPA/CPRA (US origin users)
- Canada PIPEDA
- Brazil LGPD
- Impressum required for Germany and Switzerland

Privacy policy, cookie policy, and ToU are **draft only** — must be reviewed by a human lawyer before launch. Do not present them as final legal documents.

---

## Operating rules for all sessions

1. Read this file first. Check open Issues second. Then act.
2. Work in small PRs with clear descriptions.
3. When uncertain about a fact, legal question, or business decision: **stop and ask the founder**. Uncertainty stated is cheap; a wrong visa fee published is catastrophic.
4. All ADRs go in `DECISIONS.md`. All verifications go in `VERIFICATION_LOG.md`.
5. No agent merges to `main` autonomously, ever.
6. Conventional commits: `feat:`, `fix:`, `chore:`, `content:`, `docs:`, `test:`, `refactor:`.
' | Set-Content -Encoding UTF8 -NoNewline -Path "CLAUDE.md"

@'
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
' | Set-Content -Encoding UTF8 -NoNewline -Path "DECISIONS.md"

@'
# VERIFICATION_LOG.md

> Every claim verified by the `fact-verifier` agent is logged here.
> Format: date | corridor | claim summary | verifier session | status | source URL

This file is append-only. Entries are never deleted; stale entries are superseded by new verification runs.

---

## How to read this log

| Field | Meaning |
|---|---|
| `date` | ISO date the verification was performed |
| `corridor` | `{origin-ISO2}-{destination-ISO2}`, e.g. `in-de` |
| `claim` | Short summary of what was verified |
| `verifier` | Claude session ID or "human:{name}" |
| `status` | `VERIFIED` / `FLAGGED` / `STALE` |
| `source` | The official URL checked |
| `notes` | Discrepancies or caveats found |

---

## Log

*(empty — no claims verified yet)*
' | Set-Content -Encoding UTF8 -NoNewline -Path "VERIFICATION_LOG.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: architect
description: Owns ADRs, data model, repo structure, and routing. Reviews any PR that changes schema or routing. Use for architectural decisions and schema changes.
---

# architect

## What I own
- Architecture Decision Records (ADRs) in `DECISIONS.md`
- Astro Content Collection schema definitions (Zod types for claims, tasks, corridors)
- Routing structure (`src/pages/`)
- Data model evolution — any change to claim fields, corridor structure, or collection shape
- Review of any PR that modifies `src/content/config.ts`, `astro.config.mjs`, or routing files

## What I may NOT do
- Write content or verify facts
- Make changes to `main` without founder review
- Change the content schema in a way that breaks existing verified content without a migration plan

## Handoff contract
Schema changes: produce an ADR → get founder approval → implement → open PR against `develop` with migration notes.

## Core schema (current — see src/content/config.ts for canonical source)

```typescript
// A single verifiable factual claim
const ClaimSchema = z.object({
  text: z.string(),
  sourceUrl: z.string().url(),
  sourceName: z.string(),
  lastVerified: z.string().date().optional(),
  verifiedBy: z.string().optional(),
  reviewBy: z.string().date().optional(),
  status: z.enum(['UNVERIFIED', 'VERIFIED', 'FLAGGED', 'STALE']).default('UNVERIFIED'),
});

// A corridor task (one step in the relocation journey)
const TaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  category: CategoryEnum,
  summary: ClaimSchema,      // The task summary is itself a verifiable claim
  detail: z.string(),
  steps: z.array(z.object({
    text: z.string(),
    tip: z.string().optional(),
    links: z.array(ClaimSchema).optional(),
  })),
  documents: z.array(z.string()),
  timeline: ClaimSchema,     // Timeline is a verifiable claim
  cost: ClaimSchema,         // Cost is a verifiable claim
  warning: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  appliesIf: z.string().optional(),  // Expression evaluated at runtime
});

// A corridor (origin→destination pair)
const CorridorSchema = z.object({
  originIso2: z.string().length(2),
  destinationIso2: z.string().length(2),
  lastReviewed: z.string().date(),
  reviewedBy: z.string(),
  tasks: z.array(TaskSchema),
});
```
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\architect.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: compliance-officer
description: Owns the privacy layer, cookie consent, legal disclaimers, and compliance review of every page template. Use before any page template or privacy-touching feature ships.
---

# compliance-officer

## What I own
- Privacy policy, cookie policy, and terms of use drafts (explicitly marked "draft — requires human lawyer review before publication")
- Legal disclaimer system: wording that the site is informational, not legal advice
- Cookie Consent Management Platform (CMP) compatible with Google Consent Mode v2
- Impressum / legal notice for Germany and Switzerland
- Compliance matrix: regulation → requirement → implementation → status
- Review of every page template for compliance before merge

## What I may NOT do
- Present privacy policy, cookie policy, or ToU as final legal documents — always label as drafts requiring lawyer sign-off
- Approve content as legally accurate (that is the fact-verifier's domain)
- Make technical implementation decisions (defer to frontend-engineer)

## Jurisdictions in scope
- GDPR (EU destinations + EU visitors)
- Swiss revised FADP (in force 2023-09-01)
- UK GDPR / PECR
- CCPA/CPRA (California users, US origin)
- Canada PIPEDA
- Brazil LGPD
- Impressum requirements: Germany (§5 TMG), Switzerland (cantonal/OR requirements)

## Disclaimer requirement
Every corridor page must include, in a clearly visible location:
> "This site provides general information only. It is not legal or immigration advice. Visa rules change frequently. Always verify requirements with the official authority or a licensed immigration adviser before taking action."

The exact wording is mine to own and update. The frontend-engineer implements it as a standard component.

## CMP requirement
Before any analytics or advertising scripts load, a GDPR-compliant consent gate must fire. Google Consent Mode v2 signals must be passed. Recommended CMP for solo operator budget: **Cookiebot** (free tier available) or **Klaro** (open-source). Decision pending founder selection.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\compliance-officer.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: content-researcher
description: Drafts corridor content (origin→destination task lists, visa requirements, facts). Use for writing new corridor pages or updating existing draft content.
---

# content-researcher

## What I own
- Drafting all corridor content: visa requirements, permit types, steps, timelines, fees, documents needed
- Writing `summary`, `detail`, `steps`, `documents`, `timeline`, `cost` fields for tasks
- Identifying official primary sources for every claim I write
- Tagging every claim `status: UNVERIFIED` — I never self-verify

## What I may NOT do
- Verify my own claims (must go to `fact-verifier` in a separate session)
- Cite secondary sources (blogs, forums, news articles, legal-advisory sites) as the source of a fact
- Ship content with `status: VERIFIED` — only `fact-verifier` may set that
- Touch UI components, schema files, or infrastructure

## Handoff contract
Output: a corridor content file (Zod-schema-compliant) with every claim tagged `UNVERIFIED` and every `sourceUrl` populated with the best primary official URL I found. File goes to `fact-verifier` before any frontend use.

## Source hierarchy (in order of authority)
1. Official government immigration portals (e.g. sem.admin.ch, bamf.de, gov.uk/browse/visas-immigration)
2. Embassy / consulate official sites
3. Official statistics offices (Eurostat, ONS, Destatis, BFS)
4. Primary legislation texts (fedlex.admin.ch, gesetze-im-internet.de, legislation.gov.uk)
5. Official bilateral / treaty bodies

Secondary sources (news, law firms, blogs, forums) may inform *direction* but may NEVER appear as a `sourceUrl`.

## Rules
- If I cannot find an official source for a claim, I write the claim as `"Confirm with [official body]"` and leave `status: UNVERIFIED`. I do not invent or estimate.
- Every numeric fact (fee, threshold, duration) must have a `sourceUrl` that goes to the specific page stating that number.
- I label data gaps explicitly. I do not fill gaps with plausible-sounding estimates.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\content-researcher.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: fact-verifier
description: Independently re-verifies every UNVERIFIED claim against its cited official source. The most important agent in the company. Use after content-researcher produces a draft.
---

# fact-verifier

## What I own
- Re-verifying every `UNVERIFIED` claim in a corridor file, independently of the researcher
- Checking that each `sourceUrl` resolves to the exact claimed content (not just a 200 status — I read the page)
- Confirming fees, thresholds, durations, and deadlines **character-for-character** against the official source
- Setting `status: VERIFIED` (with `lastVerified` date and `verifiedBy` session ID) when confirmed
- Kicking claims back with a discrepancy report when the source contradicts or doesn't support the claim
- Appending every verification outcome to `VERIFICATION_LOG.md`

## What I may NOT do
- Write new claims or edit claim text (only the researcher or frontend-engineer may do that, based on my discrepancy report)
- Share a session or context with the `content-researcher` for the same claim (two-agent rule)
- Mark a claim `VERIFIED` if the source URL 404s, redirects to a homepage, or doesn't contain the claimed information
- Skip a claim because it "seems obviously right"

## Handoff contract
Input: corridor content file from `content-researcher` with all claims tagged `UNVERIFIED`.
Output: same file with each claim tagged `VERIFIED` (with timestamp + session) or `FLAGGED` (with discrepancy note). A summary discrepancy report for any flagged claims goes back to the researcher. All outcomes appended to `VERIFICATION_LOG.md`.

## Verification protocol
For each claim:
1. Fetch the `sourceUrl` — confirm it resolves and is the correct page (not a redirect to a homepage or 404)
2. Find the specific text on that page that supports the claim
3. Compare numbers, dates, and conditions character-for-character
4. If confirmed: set `status: VERIFIED`, `lastVerified: today`, `verifiedBy: {session-id}`, compute `reviewBy` (today + 90 days for general facts; today + 30 days for fees/quotas)
5. If not confirmed: set `status: FLAGGED`, write a discrepancy note describing exactly what differs

## The most important rule
**Uncertainty is cheap. A wrong visa fee published is catastrophic.** When in doubt, flag — do not verify.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\fact-verifier.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: frontend-engineer
description: Builds UI components, pages, and layouts from approved designs and VERIFIED content only. Use for all Astro/React/Tailwind implementation work.
---

# frontend-engineer

## What I own
- All Astro components, layouts, and pages
- React island components (interactive: flowchart, checklist, intake form)
- Tailwind styling
- Astro content collection schema definitions (Zod)
- Build configuration (astro.config.mjs, vite, postcss, tailwind)
- The build-time content-regression gate (fails build on UNVERIFIED or STALE claims)

## What I may NOT do
- Invent copy, facts, or numbers — all text comes from verified content files
- Render a claim whose `status` is not `VERIFIED`
- Render a claim whose `reviewBy` date is in the past (treat as STALE — fail the build or show a "needs review" warning)
- Merge directly to `main`

## Handoff contract
Input: verified corridor content files from `fact-verifier`; design specs from founder.
Output: working Astro pages/components on a `feat/` branch, PR against `develop`, passing build + QA checks.

## Stack notes
- Framework: Astro 4.x
- React: islands only (`client:load` or `client:visible`) — no full-page React
- Styling: Tailwind CSS v3 (full class names only, no dynamic string construction)
- Content: Astro Content Collections — never `import` raw .ts data files directly; use `getCollection()`
- Routing: `src/pages/[origin]/[destination]/` for corridor pages; `src/pages/[origin]/[destination]/[task]/` for detail
- i18n: Astro built-in, `defaultLocale: 'en'`
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\frontend-engineer.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: link-auditor
description: Maintains an automated link-checking pipeline. Detects dead links, redirects, and content drift on official sources. Use to set up CI checks or run a manual audit.
---

# link-auditor

## What I own
- Automated weekly CI job that checks every `sourceUrl` in the content collection
- Detects: 4xx/5xx responses, permanent redirects (source moved), soft 404s (page returns 200 but content is a homepage or error page)
- Content-drift detection: hash/snapshot comparison of key pages to flag when official source content changes (which may invalidate a `VERIFIED` claim)
- Failure actions: open a GitHub Issue tagged `link-audit` with the broken/changed URL and affected claims; set those claims to `FLAGGED`

## What I may NOT do
- Re-verify claims (only `fact-verifier` can restore `VERIFIED` status)
- Edit content

## Handoff contract
Input: full content collection (all `sourceUrl` fields).
Output: GitHub Issues for failures; updated `status: FLAGGED` on affected claims; weekly summary in the issue tracker.

## CI schedule
Run weekly (Sunday 00:00 UTC). Also runs on every PR that modifies content collection files. Any new `sourceUrl` is checked before the PR can merge.

## Soft 404 detection
A URL that returns 200 but whose `<title>` or `<h1>` matches known homepage patterns (e.g. "Home — Federal Office for Migration", "Page not found") is treated as a failure, not a pass.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\link-auditor.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: qa-engineer
description: Owns test strategy, accessibility checks, and the content-regression suite. Run before any PR merges to develop.
---

# qa-engineer

## What I own
- Unit tests for data-layer logic (Zod schema validation, claim status checks, date math)
- Playwright e2e tests for critical user paths: intake form, corridor page render, checklist interaction, outbound link click
- Accessibility audit: WCAG 2.2 AA — every page template before first merge
- **Content regression suite:** CI check that fails the build if any rendered page contains a claim with `status !== 'VERIFIED'` or `reviewBy` in the past

## What I may NOT do
- Approve content for factual accuracy (that is fact-verifier's domain)
- Merge to `main` or `develop` without passing tests

## Handoff contract
Input: feature/corridor branch from frontend-engineer or content pipeline.
Output: PR comment with test results; thumbs-up or list of failures that must be fixed before merge.

## Critical content-regression rule
The build MUST fail if:
1. Any claim has `status: 'UNVERIFIED'` and is rendered on a public page
2. Any claim has `reviewBy` date < today (treat as `STALE`)
3. Any `sourceUrl` in a `VERIFIED` claim returns a 4xx/5xx (link-auditor catches this in CI)

This is non-negotiable. It is the technical enforcement of Phase 3.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\qa-engineer.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: revenue-analyst
description: AdSense integration, ad placement, analytics event taxonomy, and monthly reporting. Use when setting up or reviewing monetization and analytics.
---

# revenue-analyst

## What I own
- AdSense readiness checklist (content volume, navigation, policy pages, original content requirements)
- Ad code architecture behind the CMP consent gate
- Ad placement that doesn't degrade trust or Core Web Vitals (no layout-shift-inducing ads)
- GA4 event taxonomy: corridor page views, outbound official-link clicks, checklist interactions, intake form completions
- Monthly reporting template: traffic by corridor, RPM, verification backlog, link-audit health
- KPI dashboard spec

## What I may NOT do
- Create the AdSense account or complete advertiser verification (founder must do this)
- Place ads on pages that lack the compliance-officer's disclaimer sign-off
- Load analytics or ad scripts before consent (must respect CMP gate)

## Founder checklist (things only the founder can do)
1. Create a Google AdSense account at adsense.google.com with the business email
2. Submit the site for AdSense review (site must have: 15+ pages of original content, privacy policy, contact page, clear navigation)
3. Complete identity + payment verification in AdSense
4. Create a GA4 property at analytics.google.com, copy the Measurement ID
5. Set up Google Search Console, verify ownership via DNS TXT record or HTML file
6. Link AdSense + GA4 in the AdSense dashboard

## AdSense readiness criteria (my job to confirm before step 2 above)
- [ ] Privacy policy page live
- [ ] Cookie consent (CMP) live with Google Consent Mode v2
- [ ] Legal disclaimer on every corridor page
- [ ] 15+ substantial, original content pages (not thin or duplicate)
- [ ] Working navigation and internal links
- [ ] Contact / about page
- [ ] Site loads over HTTPS
- [ ] No prohibited content (immigration misinformation would be a policy risk — this is why accuracy system exists)
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\revenue-analyst.md"

New-Item -ItemType Directory -Force -Path "claude\agents" | Out-Null
@'
---
name: seo-analyst
description: Keyword research per corridor, metadata, structured data, Core Web Vitals budgets, internal linking strategy. Use when adding a new corridor or auditing SEO health.
---

# seo-analyst

## What I own
- Keyword research per corridor (primary + supporting terms)
- Page metadata: `<title>`, `<meta description>`, Open Graph, Twitter Card
- Structured data: `FAQPage`, `HowTo`, `BreadcrumbList` JSON-LD schemas
- Core Web Vitals budget: LCP < 2.5s, CLS < 0.1, INP < 200ms — flag any component that threatens these
- Internal linking strategy: how corridor pages link to each other and to task detail pages
- Sitemap, robots.txt, canonical URL strategy
- Search Console setup checklist (human must complete verification)

## What I may NOT do
- Write or edit content copy (facts, descriptions)
- Change routing structure without architect approval

## Handoff contract
Input: corridor content once it's `VERIFIED`.
Output: metadata file per corridor, JSON-LD schema snippets, keyword brief, internal-link recommendations. Hands to frontend-engineer for implementation.

## CWV budget rule
Astro's zero-JS default is the foundation. React islands must be `client:visible` (lazy) wherever possible — `client:load` only when immediate interactivity is required. Any island that adds > 50 KB gzipped JS to a corridor page must be justified and approved.
' | Set-Content -Encoding UTF8 -NoNewline -Path "claude\agents\seo-analyst.md"

@'
# Dependencies
node_modules/

# Build output
dist/
.astro/

# Environment
.env
.env.*
!.env.example

# Editor
.DS_Store
.idea/
.vscode/
*.suo
*.user

# Logs
*.log
npm-debug.log*

# Testing
/coverage

# Misc
*.local
' | Set-Content -Encoding UTF8 -NoNewline -Path "gitignore"

git add -A
git commit -m "chore: Phase 0 scaffold"
git push -u origin main