# Relocation Guide

A website guiding people relocating **from non-EU countries to Western European countries**.
Content is organised by **origin → destination corridors** (e.g. India → Germany, USA → Switzerland).

Because users make legal, financial, and life-altering decisions from this content, every
factual claim is traced to a **primary official source**, independently verified, dated, and
shown to the reader. The build **fails** if any published claim is unverified or out of date.

> ⚠️ Informational only — not legal or immigration advice. See the on-site disclaimer.

---

## Status & progress

**Full roadmap and corridor coverage:** see [`ROADMAP.md`](ROADMAP.md) — the canonical
progress tracker. Snapshot:

| Phase | Scope | Status |
|---|---|---|
| **Phase 0** | Governance scaffold: `CLAUDE.md`, ADRs, agent definitions | ✅ Done |
| **Phase 1** | Technical foundation: Astro app, content schema, **provenance build gate**, UI shell, tests | ✅ Done |
| **Phase 2** | First corridors through the content pipeline; SEO; compliance pages; analytics | ⏳ Planned |
| **Phase 3** | Accuracy system (provenance rules) — enforced continuously from Phase 1 onward | 🔁 Ongoing |
| **Phase 4** | Monetisation (AdSense) + scale to more corridors/destinations | 🗓️ Backlog |

**Right now:** USA → Switzerland (`us-ch`) covers **two verified routes — work and family
reunification — with 49/49 claims independently verified** (12 tasks; `appliesIf` rules route
each user to their own plan, approved by the fact-verifier). The
corridor app was reshaped into a **guided form** (ADR-0008): a branching intake (origin,
destination, passports, motivation + follow-ups, stay, children) followed by a one-task-at-a-time
plan with a journey/answer-history sidebar. The dependency graph is now backend-only
(`src/utils/journey.ts`); the visual flowchart was retired from the UI, cutting the island bundle
from ~59 kB to ~9 kB gzip (the dead `CorridorFlowchart.tsx` + `@xyflow/react` code is now fully
removed from the repo). Country choices are gated to published corridors. Plans are shareable and
bookmarkable (F-08): answers ride in the URL fragment — never sent to our servers, free-typed text
never included, per the compliance share-link ruling. Ready for founder approval.
A third route — **retirement / residence without gainful employment** (FNIA Art. 28) — is
**live**: 20/20 claims independently verified, "Retirement" added to the intake, and retirees
get their own non-employed pension task in place of the employee-framed one. The corridor now
holds **69 verified claims across 15 tasks and 3 routes**; a study-route research lane and a
weekly source-link watchdog (CI) are in progress.

---

## How it works

### Content pipeline
Every corridor moves through these stages — the writer and the verifier are always
**different sessions** (two-agent rule):

```
content-researcher → fact-verifier → frontend-engineer → compliance-officer → qa-engineer → [founder review] → merge
```

### The accuracy gate
Each fact a user could act on (a fee, a deadline, a threshold) is a `Claim` carrying its own
provenance: `sourceUrl`, `sourceName`, `lastVerified`, `verifiedBy`, `reviewBy`, `status`.

- Researchers draft claims as `UNVERIFIED`; only the `fact-verifier` may set `VERIFIED`.
- A corridor renders publicly only when `published: true`.
- At build time, `assertCorridorPublishable` (in `src/utils/provenance.ts`) **throws and fails
  `astro build`** if any published claim is not `VERIFIED` or its `reviewBy` date has passed.
- Default review window: 90 days (30 days for fees and quotas).

### Adding a corridor
Add one file: `src/content/corridors/{originIso2}-{destinationIso2}.yaml` (the UK is `gb`).
No code changes required. See [`src/content/corridors/_README.md`](src/content/corridors/_README.md)
for the file shape.

---

## Tech stack

- **Framework:** Astro 4.x (zero-JS by default for SEO / Core Web Vitals)
- **Interactivity:** React islands (`@astrojs/react`) — guided intake + plan app (`CorridorApp`)
- **Content:** Astro Content Collections + Zod (provenance enforced at compile + build time)
- **Styling:** Tailwind CSS
- **Hosting:** Cloudflare Pages (static output)
- **i18n:** Astro built-in routing (English-only at launch)

See [`DECISIONS.md`](DECISIONS.md) for the full architecture decision log.

---

## Repository layout

```
relocation-guide/
├── CLAUDE.md            ← project rules (read first, every session)
├── DECISIONS.md         ← architecture decision records (ADRs)
├── VERIFICATION_LOG.md  ← per-claim verification record
├── .claude/agents/      ← sub-agent definitions
├── src/
│   ├── components/      ← Disclaimer, Provenance, CorridorApp (island)
│   ├── content/         ← schema.ts (canonical model), config.ts, corridors/
│   ├── layouts/         ← BaseLayout
│   ├── pages/           ← index + [origin]/[destination] corridor route
│   └── utils/           ← provenance.ts (build gate), corridors.ts
├── tests/               ← Vitest gate tests
├── public/
└── astro.config.mjs
```

---

## Local development

> **Note:** Node.js is required. On the current dev machine it was installed via winget
> (user scope) and may not be on `PATH` — see the project memory if commands aren't found.

```bash
npm install        # install dependencies
npm run dev        # local dev server
npm run build      # production build (runs the provenance gate)
npm run preview    # preview the production build
npm test           # run the gate unit tests
npm run check      # astro check (type checking)
```

---

## Branch model

| Branch | Purpose |
|---|---|
| `main` | Production. Protected. Merged from `develop` via reviewed PR only. |
| `develop` | Integration branch; all feature PRs target here. |
| `feat/*`, `fix/*`, `corridor/*`, `agent/*` | Working branches. |

Claude never pushes to `main` or merges autonomously — the founder reviews and merges
`develop → main`.

---

## Contributing & accuracy

This project treats every page **as if an immigration lawyer will audit it**. No claim ships
without a primary official source. If you can't find one, the claim stays `UNVERIFIED` and is
not published. When in doubt, flag it — a wrong visa fee published is catastrophic; uncertainty
stated is cheap.

Privacy policy, cookie policy, and terms are **draft only** until reviewed by a human lawyer.
