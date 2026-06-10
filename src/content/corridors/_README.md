# Corridors content collection

One file per origin -> destination corridor, named `{originIso2}-{destinationIso2}.yaml`
(e.g. `in-de.yaml` for India -> Germany, `us-ch.yaml` for USA -> Switzerland).
The UK uses `gb`. Adding a corridor = adding a file here. No code changes required.

This directory is intentionally **empty of content at the end of Phase 1**. Real
corridor data only enters through the pipeline (CLAUDE.md):

```
content-researcher -> fact-verifier -> frontend-engineer -> compliance-officer -> qa-engineer -> [founder review] -> merge
```

## Rules (Phase 3)

- Every factual claim (`summary`, `timeline`, `cost`, step `links[]`) needs a
  primary official `sourceUrl` and is tagged `status: UNVERIFIED` by the
  researcher. Only the `fact-verifier` may set `status: VERIFIED`.
- `published: false` until the founder approves the first version (human gate).
- When `published: true`, the build gate (`src/utils/provenance.ts`) fails the
  build if any claim is not `VERIFIED` or its `reviewBy` date has passed.

## File shape

See `src/content/schema.ts` for the canonical schema. Skeleton:

```yaml
originIso2: in
destinationIso2: de
title: "Moving from India to Germany"
description: "Visas, permits, and the practical steps to relocate from India to Germany."
lastReviewed: "2026-06-09"
reviewedBy: "content-researcher"
published: false
tasks:
  - id: work-visa
    title: "Apply for a work visa"
    category: visa-permit
    summary:
      text: "..." # the claim as it appears on the page
      sourceUrl: "https://official.example/..."
      sourceName: "Federal Foreign Office"
      status: UNVERIFIED
    detail: "..."
    steps:
      - text: "..."
        tip: "..."
        links:
          - text: "Official application portal"
            sourceUrl: "https://official.example/apply"
            sourceName: "..."
            status: UNVERIFIED
    documents:
      - "Valid passport"
    timeline:
      text: "Typically 4-12 weeks"
      sourceUrl: "https://official.example/processing-times"
      sourceName: "..."
      status: UNVERIFIED
    cost:
      text: "EUR 75 visa fee"
      sourceUrl: "https://official.example/fees"
      sourceName: "..."
      status: UNVERIFIED
    dependsOn: []
```
