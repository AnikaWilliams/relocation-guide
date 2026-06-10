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
