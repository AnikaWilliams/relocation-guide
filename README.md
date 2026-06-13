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
| **Phase 2** | First corridors through the content pipeline; SEO; compliance pages; analytics | 🚧 In progress |
| **Phase 3** | Accuracy system (provenance rules) — enforced continuously from Phase 1 onward | 🔁 Ongoing |
| **Phase 4** | Monetisation (AdSense) + scale to more corridors/destinations | 🗓️ Backlog |

**Right now:** USA → Switzerland (`us-ch`) covers **four verified routes — work, family
reunification, retirement (non-gainful, FNIA Art. 28), and study (Art. 27) — with 218/218 claims
independently verified** across **21 tasks**. The corridor app is a **guided form** (ADR-0008): a
branching intake (origin, destination, passports, motivation + follow-ups, stay, children) →
a one-task-at-a-time plan with a journey/answer-history sidebar; `appliesIf` rules (ADR-0009)
route each user to their own steps. **Every country is selectable** in the intake (nothing
is preselected on first open); a route with no published guide leads to a **launch
waitlist** — an email/phone capture with explicit consent, dormant by default so nothing
leaves the browser until a backend is wired (ADR-0015) — rather than a dead end.
The dependency graph is backend-only (`src/utils/journey.ts`);
the visual flowchart was retired (island bundle ~59 kB → ~9 kB gzip then; ~14.5 kB gzip now with the waitlist). Every step now carries a
**document checklist + scannable key facts** (ADR-0012): each task lists what you provide vs. the
official form to obtain, with form links to the issuing authority's own page (never self-hosted).
Plans are shareable via the URL fragment (F-08, no answers sent to servers); the full guide also
renders as indexable markup below the app (ADR-0011). A weekly link-auditor CI watches every
source URL. The corridor is **founder-approved** (human gate, ADR-0014).

**Launch readiness (2026-06-13):** draft Privacy / Cookie / Terms / About / Contact pages (legal
ones clearly marked DRAFT pending lawyer review), a branded og:image social card, and a
reject-by-default **cookie-consent banner** gating Plausible + GA4 + AdSense — all **dormant
until the production domain and analytics IDs exist** (nothing loads without them; ADR-0013).
**Remaining go-live blockers are infrastructural:** a production domain + Cloudflare Pages deploy,
a human lawyer's review of the legal drafts, and operator details for the Impressum/Contact.
Monetization (AdSense) is documented but not yet eligible — see [`docs/monetization.md`](docs/monetization.md).

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
