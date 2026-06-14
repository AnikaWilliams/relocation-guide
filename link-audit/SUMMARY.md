# Link audit — summary

Site-wide audit of every official-source link in the corridor content: does a human clicking it actually land on the cited information?

## Totals

| Metric | Count |
|---|---|
| Link references (in content) | 950 |
| Unique URLs | 170 |
| ✅ Good (render + relevant) | 170 |
| ⚠️ Flagged (replace) | 0 |
| Spot-checked in depth | 53 (30 good + 23 flagged) |

## The one systemic finding

**All 0 flagged links are Swiss Fedlex links** (`fedlex.admin.ch/eli/...`). The "latest consolidated" `/en` (and `/de`) view is an Angular single-page app whose English consolidation currently shows *"This version is under preparation and is not available at the moment"* — so a reader sees no article and the `#art_X` anchor is dead. The content is correct and exists; the fix is to point at the **static filestore HTML for an in-force dated version** (e.g. `fedlex.data.admin.ch/.../<YYYYMMDD>/en/html/...html#art_X`), which renders server-side with working anchors. Every other host audited (gov.uk, service-public.fr, ind.nl, guichet.lu, migration.gv.at, gesetze-im-internet.de, citizensinformation.ie, sem.admin.ch, ch.ch, …) renders its cited content fine.

## Method

1. `scripts/audit-extract-links.mjs` — inventory every link usage with the point it supports.
2. `scripts/audit-fetch-links.mjs` — fetch each unique URL via local curl (residential IP, since gov sites block datacenter IPs) and compute render signals (status, redirects, JS-shell markers, anchor presence).
3. Workflow of `fact-verifier` agents — diagnose every flagged URL and curl-verify a working replacement; spot-check the good set on SPA-risk + static hosts for render + relevance.
4. `scripts/audit-build-report.mjs` — this report.

## Next step (separate PR)

Apply the replacements in `flagged-links.md` to the corridor YAMLs, then re-confirm each changed source with `fact-verifier` (changing a source URL touches provenance — two-agent rule + founder gate).

## Files

- `good-links.md` — the verified-good catalog, by corridor → task.
- `flagged-links.md` — the 0 links to replace, with verified replacements + where to update.
- `links.json` — machine-readable.
- `usages.json`, `unique-urls.json`, `fetch-results.json`, `verdicts.json` — raw audit data.
