# Monetization groundwork

> Status: **groundwork only**. No live ad code ships yet. This document is the
> plan and the gating checklist. Owner: `revenue-analyst`. Last updated: 2026-06-13.
>
> Related: ADR-0004 (analytics: Plausible + GA4-behind-consent), the consent gate
> (`src/components/ConsentBanner.tsx` + `src/utils/analytics.ts`), and the
> draft Cookie/Privacy policies.

---

## TL;DR for the founder

We are **not eligible for ads yet**, and that's fine — putting ads on a 1-corridor
site would earn ~nothing and could get the AdSense application rejected. The two
real blockers are **(a) no live domain** and **(b) not enough content/pages**.
This sprint builds the *plumbing* (consent gate, analytics hooks, ad-placement
plan) so that the day the site is live with enough corridors, switching ads on is
a config change, not a rebuild.

---

## 1. AdSense readiness — gap analysis

Google reviews a site against its Publisher Policies before approving AdSense.
Status of each major requirement today:

| Requirement | Needed | Today | Gap |
|---|---|---|---|
| Live site on its own HTTPS domain | Yes | ❌ No production domain (placeholder `relocation-guide.example`) | **Blocker** — register domain + deploy to Cloudflare Pages (roadmap 2c) |
| Sufficient original, high-value content | ~15+ substantive indexable pages is the rule-of-thumb | ❌ ~1 corridor page + home + legal/about/contact | **Blocker** — publish more corridors (each corridor = 1 rich indexable guide) |
| Required policy pages | Privacy, Cookies, Terms, Impressum, About, Contact | ✅ all drafted this sprint (legal pages pending lawyer sign-off) | Minor — finalise wording + operator details |
| Clear site navigation | Yes | ✅ footer nav now links all pages; home lists corridors | Done |
| Cookie consent for EEA/UK/CH traffic | Required (ad personalisation needs consent) | ✅ consent gate built (dormant) | Done (activates with config) |
| Original content, not "thin"/scraped | Yes | ✅ content is original, source-verified | Done |
| Owner is 18+ with a payments account | Yes | ⏳ founder action | Founder to set up AdSense + payments at apply time |
| No prohibited content | Yes | ✅ informational relocation content | Done |

**Honest read:** even with every policy page finished, the site cannot apply
until it has (1) a real domain and (2) materially more content. Applying early
risks a rejection that is harder to recover from than simply waiting.

### Path to eligibility (in order)

1. Finish + lawyer-review the legal pages; fill operator details (also needed for Impressum).
2. Register the production domain; deploy to Cloudflare Pages; set `SITE_URL`.
3. Grow content to ~15+ indexable pages (more corridors; each is one rich guide page).
4. Turn on cookieless Plausible (set `PUBLIC_PLAUSIBLE_DOMAIN`) to establish a traffic baseline.
5. Apply to AdSense. On approval, set `PUBLIC_ADSENSE_CLIENT` and add ad slots per §3.

---

## 2. Analytics event taxonomy

For the approved stack (ADR-0004): **Plausible** (cookieless, primary) + **GA4**
(behind consent). Fire via `trackEvent(name, props)` in `src/utils/analytics.ts`.

**Hard privacy rule (compliance):** events carry **no personal data and no
free-text intake** — never passports, employer/institution names, or "other"
text. Only coarse enums: corridor route, motivation, step index, task id, booleans.

| Event | When | Properties (coarse only) |
|---|---|---|
| `intake_start` | First intake step shown | `{ corridor }` |
| `intake_step` | Each intake step advanced | `{ corridor, step }` (step index/name) |
| `intake_complete` | Plan generated | `{ corridor, motivation }` |
| `route_not_covered` | Honest "route not covered" shown | `{ corridor, motivation, relationship }` |
| `task_open` | A task card opened | `{ corridor, task_id }` |
| `task_detail_expand` | "Read the details" accordion opened | `{ corridor, task_id }` |
| `doc_check` | A document checked/unchecked | `{ corridor, task_id, checked }` |
| `task_done` | A task marked done | `{ corridor, task_id }` |
| `form_link_click` | "Get form from {issuer}" clicked | `{ corridor, task_id }` (no URL/issuer free-text) |
| `source_link_click` | An official source link clicked | `{ corridor, task_id }` |
| `copy_plan_link` | Share-link copied | `{ corridor }` |
| `start_over` | Planner reset | `{ corridor }` |
| `full_guide_view` | No-JS full guide section reached | `{ corridor }` |
| `consent_set` | Consent saved | `{ analytics, advertising }` (booleans) |

`form_link_click` and `source_link_click` are the most monetisation-relevant
(intent signals), but note: these are **official-source** clicks — they are a
content-quality signal, not ad inventory. See §3.

> Implementation note: the `trackEvent` helper exists and is dormant-safe (no-op
> until a provider loads). Wiring these specific calls into `CorridorApp.tsx` is a
> follow-up task, intentionally deferred so it lands with—and can be QA'd
> against—a live analytics endpoint.

---

## 3. Ad-placement plan

All ad slots are **behind the advertising consent toggle** and only render when
`PUBLIC_ADSENSE_CLIENT` is set. Trust and UX come first — this is a site people
make legal decisions from.

**Hard rules**

- **No ad units adjacent to legal/visa claims, document checklists, official
  source links, or the disclaimer.** An ad next to a visa fee could imply
  endorsement of a vendor — unacceptable.
- **No ads inside the guided-form flow** (intake steps, task detail panel). Ads
  there would harm completion and trust.
- **CWV budget:** ads must not regress Core Web Vitals. Reserve fixed slot
  dimensions to avoid layout shift (CLS), lazy-load below-the-fold units (LCP),
  and keep the island JS budget intact.

**Permitted placements (post-launch, with content depth)**

| Location | Format | Notes |
|---|---|---|
| Home page, below the corridor list | One responsive unit | Away from any claim |
| Corridor page, **end of the indexable full guide** (`#full-guide`), after the last step | One responsive unit | Below all checklists/sources; clearly separated |
| Future editorial/blog pages | In-content, between sections | Only on non-claim editorial content |

Explicitly **excluded:** the app hero, intake wizard, task cards, document
checklists, provenance/sources block, and any legal page.

---

## 4. Proposed ADR (for the orchestrator to add to DECISIONS.md)

> **ADR-00XX — Advertising strategy (groundwork)**
> Status: Proposed. Date: 2026-06-13.
> Context: The founder asked to begin monetization. The site is pre-launch (no
> domain) and below AdSense's content-volume threshold, so ads cannot run yet.
> Decision: Ads will be **Google AdSense only**, serving **only post-launch**,
> **only behind the advertising consent toggle**, **never adjacent to legal/visa
> claims, checklists, official-source links, or the disclaimer**, and within a
> Core Web Vitals budget (reserved slot sizes, lazy-loaded below-the-fold).
> Activation is gated on a live domain + ~15 indexable pages + AdSense approval +
> `PUBLIC_ADSENSE_CLIENT` set. The consent gate and analytics hooks ship now,
> dormant.
> Consequences: No revenue until the content/domain blockers clear; trust and CWV
> are protected by construction; turning ads on is a config + slot-insertion
> change, not a rearchitecture.

---

## Blockers summary

1. **No production domain** — blocks analytics go-live, AdSense application, and ads. (Roadmap 2c.)
2. **Content volume** — ~1 corridor today vs ~15+ indexable pages for a credible AdSense application.
3. **Legal pages pending lawyer review** — needed before relying on consent/policy pages publicly.
4. **Operator details** — needed for Impressum + AdSense payments account.
