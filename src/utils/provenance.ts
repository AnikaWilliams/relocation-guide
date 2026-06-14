import type { Claim, ClaimStatus, Corridor } from '../content/schema';

/**
 * The build gate — technical enforcement of CLAUDE.md Phase 3 accuracy rules.
 *
 * Rule 5: the build fails if any *rendered* claim has `status !== 'VERIFIED'`
 * or its `reviewBy` date is in the past. These pure functions implement that
 * check; the corridor page's `getStaticPaths` calls `assertCorridorPublishable`
 * so a violation throws during `astro build` and the build fails.
 *
 * Kept free of Astro imports so it is unit-testable under Vitest.
 */

/** Default review windows, in days (CLAUDE.md rule 4). For reference/tooling. */
export const REVIEW_WINDOW_DAYS = {
  general: 90,
  feesAndQuotas: 30,
} as const;

/** Parse an ISO `YYYY-MM-DD` date string to a UTC-midnight Date. */
function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  // Guard against rollover (e.g. 2026-02-30 -> March).
  if (
    date.getUTCFullYear() !== Number(y) ||
    date.getUTCMonth() !== Number(mo) - 1 ||
    date.getUTCDate() !== Number(d)
  ) {
    return null;
  }
  return date;
}

/** Truncate any Date to UTC-midnight for date-only comparison. */
function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export interface PublishabilityResult {
  publishable: boolean;
  /** The status as it should be treated *now* (VERIFIED claims past reviewBy become STALE). */
  effectiveStatus: ClaimStatus;
  /** Human-readable reason when not publishable; empty string when publishable. */
  reason: string;
}

/**
 * Determine whether a single claim may be rendered as of `now`.
 *
 * A claim is publishable only if it is VERIFIED, carries its verification
 * metadata, and its review date has not passed.
 */
export function evaluateClaim(claim: Claim, now: Date = new Date()): PublishabilityResult {
  if (claim.status === 'FLAGGED') {
    return { publishable: false, effectiveStatus: 'FLAGGED', reason: 'claim is FLAGGED' };
  }
  if (claim.status === 'STALE') {
    return { publishable: false, effectiveStatus: 'STALE', reason: 'claim is STALE' };
  }
  if (claim.status !== 'VERIFIED') {
    return {
      publishable: false,
      effectiveStatus: claim.status,
      reason: `status is ${claim.status}, expected VERIFIED`,
    };
  }

  // status === 'VERIFIED' beyond this point.
  if (!claim.lastVerified || !claim.verifiedBy) {
    return {
      publishable: false,
      effectiveStatus: 'UNVERIFIED',
      reason: 'VERIFIED claim is missing lastVerified/verifiedBy provenance',
    };
  }
  if (!claim.reviewBy) {
    return {
      publishable: false,
      effectiveStatus: 'STALE',
      reason: 'VERIFIED claim is missing reviewBy date',
    };
  }

  const reviewBy = parseDateOnly(claim.reviewBy);
  if (!reviewBy) {
    return {
      publishable: false,
      effectiveStatus: 'STALE',
      reason: `reviewBy "${claim.reviewBy}" is not a valid YYYY-MM-DD date`,
    };
  }

  const today = toDateOnly(now);
  if (reviewBy.getTime() < today.getTime()) {
    return {
      publishable: false,
      effectiveStatus: 'STALE',
      reason: `reviewBy ${claim.reviewBy} is in the past`,
    };
  }

  return { publishable: true, effectiveStatus: 'VERIFIED', reason: '' };
}

/** Convenience: status as it should be displayed now (downgrades expired VERIFIED to STALE). */
export function getEffectiveStatus(claim: Claim, now: Date = new Date()): ClaimStatus {
  return evaluateClaim(claim, now).effectiveStatus;
}

/** Convenience boolean wrapper around {@link evaluateClaim}. */
export function isClaimPublishable(claim: Claim, now: Date = new Date()): boolean {
  return evaluateClaim(claim, now).publishable;
}

export interface LocatedClaim {
  claim: Claim;
  /** Dotted path describing where the claim lives, e.g. `tasks[work-permit].cost`. */
  location: string;
}

/** Flatten every Claim in a corridor, with a location label for diagnostics. */
export function collectClaims(corridor: Corridor): LocatedClaim[] {
  const out: LocatedClaim[] = [];
  for (const task of corridor.tasks) {
    const base = `tasks[${task.id}]`;
    out.push({ claim: task.summary, location: `${base}.summary` });
    if (task.tldr) out.push({ claim: task.tldr, location: `${base}.tldr` });
    task.keyFacts?.forEach((fact, fi) => {
      out.push({ claim: fact, location: `${base}.keyFacts[${fi}] (${fact.label})` });
    });
    if (task.timeline) out.push({ claim: task.timeline, location: `${base}.timeline` });
    if (task.cost) out.push({ claim: task.cost, location: `${base}.cost` });
    task.steps.forEach((step, si) => {
      step.links?.forEach((link, li) => {
        out.push({ claim: link, location: `${base}.steps[${si}].links[${li}]` });
      });
    });
    task.documents.forEach((doc, di) => {
      // Legacy string documents carry no claim; structured 'form' documents do.
      if (typeof doc !== 'string' && doc.form) {
        out.push({ claim: doc.form, location: `${base}.documents[${di}] (${doc.name})` });
      }
    });
  }
  // Per-canton claims (ADR-0021) are gated like every other rendered claim.
  corridor.cantons?.forEach((canton) => {
    const cbase = `cantons[${canton.code}]`;
    out.push({ claim: canton.migrationOffice, location: `${cbase}.migrationOffice` });
    out.push({ claim: canton.taxInfo, location: `${cbase}.taxInfo` });
    canton.notes?.forEach((note, ni) => {
      out.push({ claim: note, location: `${cbase}.notes[${ni}] (${note.label})` });
    });
  });
  return out;
}

export interface CorridorViolation {
  location: string;
  reason: string;
  text: string;
}

/** Return every claim in the corridor that may not be rendered as of `now`. */
export function findCorridorViolations(
  corridor: Corridor,
  now: Date = new Date()
): CorridorViolation[] {
  const violations: CorridorViolation[] = [];
  for (const { claim, location } of collectClaims(corridor)) {
    const result = evaluateClaim(claim, now);
    if (!result.publishable) {
      violations.push({ location, reason: result.reason, text: claim.text });
    }
  }
  return violations;
}

/**
 * Hard build gate. Throws if the corridor contains any claim that may not be
 * rendered. Called from the corridor page's `getStaticPaths`, so a violation
 * fails `astro build`.
 */
export function assertCorridorPublishable(corridor: Corridor, now: Date = new Date()): void {
  const violations = findCorridorViolations(corridor, now);
  if (violations.length > 0) {
    const id = `${corridor.originIso2}-${corridor.destinationIso2}`.toLowerCase();
    const detail = violations
      .map((v) => `  - ${v.location}: ${v.reason}\n      claim: "${v.text}"`)
      .join('\n');
    throw new Error(
      `[provenance gate] Corridor "${id}" is marked published but has ` +
        `${violations.length} claim(s) that cannot be rendered (Phase 3, rule 5):\n${detail}\n` +
        `Fix: re-verify via fact-verifier, or set published: false until ready.`
    );
  }
}
