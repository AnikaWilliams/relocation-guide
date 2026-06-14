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
| `architect` | ADRs, data model, repo structure, hard backend problems | Content, UI styling |
| `content-researcher` | Draft corridor content | Verification, UI code |
| `fact-verifier` | Verification of claims | Writing new claims |
| `link-auditor` | Link-checking CI | Content |
| `frontend-engineer` | Customer-facing UI from approved designs | Content copy, facts |
| `seo-analyst` | Metadata, schema, CWV | Legal, content facts |
| `compliance-officer` | Privacy, disclaimers, legal notices | Technical decisions |
| `qa-engineer` | Tests, a11y, content regression | Content, styling |
| `revenue-analyst` | AdSense, analytics, reporting | Technical, content |
| `verifier` | Read-only checks of engineering work (diffs, builds, tests) | Any file edits |
| `researcher` | Read-only lookups, extraction, background research | Repo files; corridor drafting (that's `content-researcher`) |

---

## Model routing (founder policy, 2026-06-12)

Token-cost rule, enforced via explicit `model:` frontmatter on every agent in `.claude/agents/`:

- **`claude-fable-5` only for:** customer-facing frontend design work (`frontend-engineer`)
  and genuinely hard backend engineering (`architect`: architecture decisions, complex data
  modeling, auth, bugs that resisted a first fix).
- **`claude-opus-4-8` for everything else:** verification, extraction, research, content
  work, compliance, SEO, QA, analytics — all other agents carry it explicitly.
- **Never do research, extraction, or verification in the main thread — always delegate**
  to `researcher` / `verifier` (or the content-pipeline agents where the two-agent rule
  applies). The main thread orchestrates; it does not burn its own tokens on lookups.
- **Routine edits that don't fit a named agent default to Opus 4.8, never Fable 5** —
  CRUD, config changes, dependency bumps, renames. Do not invoke `architect` or
  `frontend-engineer` for these.
- Naming note: `verifier` ≠ `fact-verifier` and `researcher` ≠ `content-researcher`.
  The short-named pair are general read-only engineering helpers; the long-named pair are
  content-pipeline roles bound by the two-agent rule (section above).

---

## Tech stack (ADR-0001, approved 2026-06-10)

- **Framework:** Astro 4.x (zero-JS default for SEO/CWV)
- **Interactivity:** React islands (`@astrojs/react`) — guided intake + plan app (ADR-0008)
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

---

## FOUNDER-TLDR.md — writing rules

`FOUNDER-TLDR.md` is the founder's plain-English changelog. After any session that
changes the product, add a new entry following these rules:

- **Audience:** a smart but non-technical founder. Explain like I'm 5. No jargon.
  Any unavoidable technical term must be defined in plain words in parentheses
  right after it — e.g. "the build (the step that turns our files into the live website)".
- **Use everyday analogies** (restaurants, mail, filing cabinets, receipts) instead
  of technical descriptions.
- **Each entry is dated, newest at the top, and under 200 words**, with these four parts:
  1. **What changed** — in plain English.
  2. **Why it matters** — in business terms.
  3. **What you'd notice using the app today** — or "nothing visible yet — this is plumbing".
  4. **What's next** — one sentence.
- **Never explain the code.** Explain what the *product* can now do that it couldn't
  before. Be honest if something broke or got slower.
