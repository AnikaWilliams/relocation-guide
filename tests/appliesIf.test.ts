import { describe, it, expect } from 'vitest';
import { evaluateAppliesIf, type AppliesIfContext } from '../src/utils/appliesIf';

const ctx: AppliesIfContext = {
  motivation: 'work',
  workStatus: 'has-offer',
  durationIntent: 'long',
  hasChildren: false,
  passports: ['us', 'ie'],
  familyRelationship: null,
};

const applies = (expr: string) => evaluateAppliesIf(expr, ctx);

describe('evaluateAppliesIf', () => {
  it('applies unconditionally when no expression is given', () => {
    expect(evaluateAppliesIf(undefined, ctx).applies).toBe(true);
    expect(evaluateAppliesIf('   ', ctx).applies).toBe(true);
  });

  it('compares string fields with == and !=', () => {
    expect(applies("motivation == 'work'").applies).toBe(true);
    expect(applies("motivation == 'study'").applies).toBe(false);
    expect(applies("durationIntent != 'short'").applies).toBe(true);
  });

  it('compares boolean fields against true/false literals', () => {
    expect(applies('hasChildren == false').applies).toBe(true);
    expect(applies('hasChildren == true').applies).toBe(false);
  });

  it('supports bare truthy and negated tests', () => {
    expect(applies('hasChildren').applies).toBe(false);
    expect(applies('!hasChildren').applies).toBe(true);
    expect(applies('!familyRelationship').applies).toBe(true);
  });

  it('supports includes on list fields', () => {
    expect(applies("passports includes 'us'").applies).toBe(true);
    expect(applies("passports includes 'ch'").applies).toBe(false);
    // includes on a non-list field is simply false, not an error
    expect(applies("motivation includes 'work'").applies).toBe(false);
  });

  it('combines with && and || (&& binds tighter)', () => {
    expect(applies("motivation == 'work' && workStatus == 'has-offer'").applies).toBe(true);
    expect(applies("motivation == 'study' && workStatus == 'has-offer'").applies).toBe(false);
    expect(applies("motivation == 'study' || motivation == 'work'").applies).toBe(true);
    // a || (b && c): true || (false && ...) = true
    expect(applies("motivation == 'work' || motivation == 'study' && hasChildren").applies).toBe(true);
  });

  it('treats null/unanswered fields as non-matching, not errors', () => {
    expect(applies("familyRelationship == 'spouse'").applies).toBe(false);
    expect(applies('familyRelationship').applies).toBe(false);
  });

  it('fails OPEN (task applies) on malformed expressions, and reports the error', () => {
    for (const bad of ['motivation ==', "== 'work'", 'motivation === "work"', "'unterminated", 'a b c', '&& motivation']) {
      const r = applies(bad);
      expect(r.applies).toBe(true);
      expect(r.error).toBeTruthy();
    }
  });

  it('fails OPEN on unknown field names', () => {
    const r = applies("nonexistentField == 'x'");
    expect(r.applies).toBe(true);
    expect(r.error).toMatch(/Unknown field/);
  });
});
