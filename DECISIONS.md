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
