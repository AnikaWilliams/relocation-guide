import { describe, it, expect } from 'vitest';
import {
  evaluateClaim,
  isClaimPublishable,
  getEffectiveStatus,
  collectClaims,
  findCorridorViolations,
  assertCorridorPublishable,
} from '../src/utils/provenance';
import { CorridorSchema, type Claim, type Corridor } from '../src/content/schema';

const NOW = new Date('2026-06-09T12:00:00Z');
const FUTURE = '2026-12-31';
const PAST = '2026-01-01';
const TODAY = '2026-06-09';

function verifiedClaim(overrides: Partial<Claim> = {}): Claim {
  return {
    text: 'EUR 75 visa fee',
    sourceUrl: 'https://official.example/fees',
    sourceName: 'Official Authority',
    lastVerified: '2026-06-01',
    verifiedBy: 'fact-verifier-session-1',
    reviewBy: FUTURE,
    status: 'VERIFIED',
    ...overrides,
  };
}

describe('evaluateClaim', () => {
  it('passes a fully verified, fresh claim', () => {
    const res = evaluateClaim(verifiedClaim(), NOW);
    expect(res.publishable).toBe(true);
    expect(res.effectiveStatus).toBe('VERIFIED');
  });

  it('rejects an UNVERIFIED claim', () => {
    const res = evaluateClaim(verifiedClaim({ status: 'UNVERIFIED' }), NOW);
    expect(res.publishable).toBe(false);
    expect(res.reason).toMatch(/UNVERIFIED/);
  });

  it('rejects a FLAGGED claim', () => {
    expect(isClaimPublishable(verifiedClaim({ status: 'FLAGGED' }), NOW)).toBe(false);
  });

  it('treats a VERIFIED claim past its reviewBy as STALE and not publishable', () => {
    const res = evaluateClaim(verifiedClaim({ reviewBy: PAST }), NOW);
    expect(res.publishable).toBe(false);
    expect(res.effectiveStatus).toBe('STALE');
    expect(res.reason).toMatch(/past/);
  });

  it('allows a claim whose reviewBy is exactly today (boundary)', () => {
    expect(isClaimPublishable(verifiedClaim({ reviewBy: TODAY }), NOW)).toBe(true);
  });

  it('rejects a VERIFIED claim missing reviewBy', () => {
    expect(isClaimPublishable(verifiedClaim({ reviewBy: undefined }), NOW)).toBe(false);
  });

  it('rejects a VERIFIED claim missing verification metadata', () => {
    const res = evaluateClaim(
      verifiedClaim({ lastVerified: undefined, verifiedBy: undefined }),
      NOW
    );
    expect(res.publishable).toBe(false);
    expect(res.reason).toMatch(/provenance/);
  });

  it('rejects a malformed reviewBy date', () => {
    expect(isClaimPublishable(verifiedClaim({ reviewBy: '2026-13-40' }), NOW)).toBe(false);
  });

  it('getEffectiveStatus downgrades expired VERIFIED to STALE', () => {
    expect(getEffectiveStatus(verifiedClaim({ reviewBy: PAST }), NOW)).toBe('STALE');
  });
});

function corridor(overrides: Partial<Corridor> = {}): Corridor {
  return {
    originIso2: 'in',
    destinationIso2: 'de',
    title: 'India to Germany',
    description: 'desc',
    lastReviewed: '2026-06-01',
    reviewedBy: 'content-researcher',
    published: true,
    tasks: [
      {
        id: 'work-visa',
        title: 'Apply for a work visa',
        category: 'visa-permit',
        summary: verifiedClaim({ text: 'summary claim' }),
        detail: 'detail',
        steps: [
          {
            text: 'step 1',
            links: [verifiedClaim({ text: 'link claim' })],
          },
        ],
        documents: ['Passport'],
        timeline: verifiedClaim({ text: 'timeline claim' }),
        cost: verifiedClaim({ text: 'cost claim' }),
        dependsOn: [],
      },
    ],
    ...overrides,
  };
}

describe('collectClaims', () => {
  it('collects summary, timeline, cost, and step links', () => {
    const claims = collectClaims(corridor());
    // 1 summary + 1 timeline + 1 cost + 1 step link = 4
    expect(claims).toHaveLength(4);
    expect(claims.map((c) => c.location)).toContain('tasks[work-visa].steps[0].links[0]');
  });
});

describe('assertCorridorPublishable (build gate)', () => {
  it('does not throw when every claim is verified and fresh', () => {
    expect(() => assertCorridorPublishable(corridor(), NOW)).not.toThrow();
  });

  it('throws and names the offending location when a claim is stale', () => {
    const bad = corridor();
    bad.tasks[0].cost = verifiedClaim({ reviewBy: PAST });
    expect(() => assertCorridorPublishable(bad, NOW)).toThrow(/provenance gate/);
    const violations = findCorridorViolations(bad, NOW);
    expect(violations).toHaveLength(1);
    expect(violations[0].location).toBe('tasks[work-visa].cost');
  });

  it('throws when any claim is UNVERIFIED', () => {
    const bad = corridor();
    bad.tasks[0].summary = verifiedClaim({ status: 'UNVERIFIED' });
    expect(() => assertCorridorPublishable(bad, NOW)).toThrow();
  });
});

describe('CorridorSchema defaults', () => {
  it('applies defaults: published=false, claim status=UNVERIFIED, dependsOn=[]', () => {
    const parsed = CorridorSchema.parse({
      originIso2: 'us',
      destinationIso2: 'ch',
      title: 'USA to Switzerland',
      description: 'desc',
      lastReviewed: '2026-06-01',
      reviewedBy: 'content-researcher',
      tasks: [
        {
          id: 't1',
          title: 'Task',
          category: 'housing',
          summary: {
            text: 'x',
            sourceUrl: 'https://official.example/x',
            sourceName: 'Auth',
          },
          detail: '',
          steps: [],
          documents: [],
          timeline: {
            text: 'x',
            sourceUrl: 'https://official.example/t',
            sourceName: 'Auth',
          },
          cost: {
            text: 'x',
            sourceUrl: 'https://official.example/c',
            sourceName: 'Auth',
          },
        },
      ],
    });
    expect(parsed.published).toBe(false);
    expect(parsed.tasks[0].summary.status).toBe('UNVERIFIED');
    expect(parsed.tasks[0].dependsOn).toEqual([]);
  });
});
