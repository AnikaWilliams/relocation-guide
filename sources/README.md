# `sources/` — source-snapshot cache (ADR-0017)

A local-first, git-tracked archive of the **raw official-source content** behind
every claim, plus the tooling to detect when those sources change. It answers the
question CLAUDE.md's "as if a lawyer will audit it" standard demands: **what did
the official page say on the day we verified this claim?**

This is **not** a runtime cache — the site never fetches sources at build or run
time. It is an audit trail + a drift signal. See **ADR-0017** in `DECISIONS.md`
for the full design and rationale.

---

## Layout

```
sources/
├── README.md                       ← this file
├── <corridor>/                     ← one dir per corridor, e.g. us-ch/
│   ├── manifest.json               ← TRACKED — index of captured sources (a JSON array)
│   └── <first8-of-sha256>.txt      ← TRACKED — normalized plain-text extract of one source
└── .cache/                         ← GITIGNORED — raw payloads, regenerable
    └── <sha256>.html.gz            ← raw fetched bytes, gzipped, keyed by content hash
```

- **Tracked, small, diffable:** each corridor's `manifest.json` plus a
  **normalized text extract** per source (`<first8-of-sha256>.txt`). The text is
  the legally-relevant content and is what drift compares — markup, scripts, and
  styling are stripped so cosmetic churn doesn't register as drift.
- **Gitignored, regenerable:** the raw HTML/PDF bytes, gzipped, in `.cache/`,
  keyed by the **full** sha256. Fast local reuse within a run; not committed, to
  keep the repo lean. Delete it freely — re-running a snapshot recreates it.
- **Dedup by content hash:** identical normalized content (same sha256) produces
  one manifest entry; one source can back many claims (`claimIds`).

The text file name uses the **first 8 hex chars** of the sha256; the raw cache
file uses the **full** sha256. Both derive from the same hash.

---

## Manifest entry shape

`sources/<corridor>/manifest.json` is a **JSON array** of entries, each exactly:

```jsonc
{
  "sourceUrl":   "https://…",          // the URL fetched
  "sourceName":  "SEM",                // issuing authority (human-readable)
  "claimIds":    ["task-id", "…"],     // claims that cite this source (may be empty)
  "fetchedAt":   "2026-06-13",         // YYYY-MM-DD capture date — METADATA, NOT part of the hashed text
  "fetchMethod": "curl",               // how it was fetched (local curl)
  "sha256":      "…",                  // sha256 of the NORMALIZED text (the drift key)
  "byteSize":    12345,                // size of the raw fetched body, in bytes
  "contentType": "text/html",          // content-type reported by the server
  "textPath":    "sources/<corridor>/<first8>.txt",  // repo-relative path to the text extract
  "capturedBy":  "snapshot-source"     // tool / teammate / human that captured it
}
```

`sha256` hashes the **normalized text**, not the raw bytes — so it is stable
across cosmetic markup changes and identical across runs/OSes. It is the same
value the (optional) `sourceHash` field on a `Claim` can store, letting CI
cross-check a rendered claim against its tracked snapshot.

---

## Normalization (must stay deterministic)

`scripts/lib/normalize-source.mjs` turns raw source bytes into the comparable
text + hash. It is **deterministic** — no `Date`, no locale, no randomness — so
the same input always yields the same `{ text, sha256 }`:

- **HTML** (content-type contains `html`): strip `<script>`/`<style>` blocks
  whole, remove all remaining tags, decode a minimal entity set
  (`&amp; &lt; &gt; &quot; &#39; &nbsp;`), collapse whitespace runs to a single
  space, trim.
- **Non-HTML:** treat as plain text → whitespace-normalize only.

Changing these rules changes every hash, so normalization is pinned by
`tests/normalize-source.test.ts` (offline; asserts exact text + a hardcoded hash
+ determinism).

---

## Tooling

| Command | What it does |
|---|---|
| `npm run sources:snapshot -- <url> <corridor> [--name "Authority"] [--claim <taskId>]` | Fetch a source via local curl, normalize, hash, and write the raw `.gz` (cache), the `.txt` (tracked), and a manifest entry. Dedup by sha256; merges `--claim` into an existing entry. On fetch failure: writes nothing, exits non-zero. |
| `npm run sources:check [-- --strict]` | Re-fetch every tracked source live, normalize, hash, and compare to the stored sha256. Prints `OK` / `DRIFTED` / `UNREACHABLE` per URL + a summary. Exit 0 by default (drift = warning); `--strict` exits non-zero on any drift/unreachable. Prints `no sources tracked yet` and exits 0 when empty. |

`scripts/snapshot-source.mjs` can also be run directly with `node`.

### Why local curl (not agent WebFetch)

Government sites (`*.admin.ch`, `ch.ch`, and likely others) block or serve an
error shell to datacenter IPs, which defeats agent `WebFetch`. Local curl runs
from a residential IP and sees the real page. See ADR-0016 / ADR-0017.

---

## Two-team integration (preserves the two-agent rule)

- **Research run** (`content-researcher`): after curl-fetching a source,
  snapshot it (raw → cache, text + hash → manifest). Claims stay `UNVERIFIED`.
- **Verification run** (`fact-verifier`): **always re-fetches the source LIVE**
  and re-derives the claim — it does **not** trust the research snapshot as
  evidence. It then diffs its live fetch against the snapshot: immaterial diff +
  source supports the claim → `VERIFIED` (record `sourceHash`); **materially
  different** → the page changed between research and verify → flag, claim stays
  `UNVERIFIED`.

The snapshot is an audit trail and a drift signal — **never** a substitute for
the live integrity check.

## Privacy

Only **public official pages** (no PII, no auth-walled content) may be
snapshotted. Do not capture anything behind a login or containing personal data.
