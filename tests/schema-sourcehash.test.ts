import { describe, it, expect } from 'vitest';
import { ClaimSchema } from '../src/content/schema';

/**
 * ADR-0017: the optional `sourceHash` (sha256 of the normalized source text at
 * last verification) must be back-compatible — a claim parses whether or not it
 * carries the field, so existing corridors (e.g. us-ch.yaml) keep validating.
 */

const baseClaim = {
  text: 'CHF 88 permit fee',
  sourceUrl: 'https://official.example/fees',
  sourceName: 'Official Authority',
  lastVerified: '2026-06-01',
  verifiedBy: 'fact-verifier-session-1',
  reviewBy: '2026-12-31',
  status: 'VERIFIED' as const,
};

describe('ClaimSchema sourceHash (ADR-0017)', () => {
  it('parses a claim WITH a valid sourceHash', () => {
    const withHash = {
      ...baseClaim,
      sourceHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    };
    const parsed = ClaimSchema.parse(withHash);
    expect(parsed.sourceHash).toBe(withHash.sourceHash);
  });

  it('parses the same claim WITHOUT a sourceHash (back-compat)', () => {
    const parsed = ClaimSchema.parse(baseClaim);
    expect(parsed.sourceHash).toBeUndefined();
  });
});
