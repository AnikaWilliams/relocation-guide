import { describe, it, expect } from 'vitest';
import {
  hasIntakeParams,
  readIntakeParams,
  intakeToParams,
  intakeSearchString,
  applyIntakeParams,
  type PlanIntake,
} from '../src/utils/urlState';

/** A completed family-route intake (US → CH). */
const familyIntake: PlanIntake = {
  origin: 'us',
  destination: 'ch',
  passports: ['us', 'in'],
  motivation: 'family',
  workStatus: null,
  familyRelationship: 'unmarried-partner',
  familyJoineeStatus: 'citizen',
  studyStatus: null,
  durationIntent: 'long',
  companions: [],
};

const workIntake: PlanIntake = {
  ...familyIntake,
  passports: ['us'],
  motivation: 'work',
  workStatus: 'has-offer',
  familyRelationship: null,
  familyJoineeStatus: null,
  durationIntent: 'permanent',
  companions: ['partner', 'children'],
};

describe('intakeSearchString', () => {
  it('encodes a family profile compactly, with no percent-encoding needed', () => {
    expect(intakeSearchString(familyIntake)).toBe(
      'pp=us,in&m=family&rel=unmarried-partner&fs=citizen&dur=long',
    );
  });

  it('encodes a work profile and omits other branches', () => {
    expect(intakeSearchString(workIntake)).toBe('pp=us&m=work&ws=has-offer&dur=permanent&co=partner,children');
  });

  it('omits branch params that do not belong to the chosen motivation', () => {
    // A leftover family answer must not leak into a work URL.
    const mixed: PlanIntake = { ...workIntake, familyRelationship: 'spouse' };
    expect(intakeSearchString(mixed)).not.toContain('rel=');
  });

  it('omits unanswered fields entirely', () => {
    const blank: PlanIntake = {
      ...familyIntake,
      passports: [],
      motivation: null,
      familyRelationship: null,
      familyJoineeStatus: null,
      durationIntent: null,
      companions: [],
    };
    expect(intakeSearchString(blank)).toBe('');
  });

  it('never encodes origin/destination — they live in the path', () => {
    const keys = intakeToParams(familyIntake).map(([k]) => k);
    expect(keys).not.toContain('origin');
    expect(keys).not.toContain('destination');
  });
});

describe('round trip', () => {
  it('decode(encode(intake)) reproduces every plan-affecting answer', () => {
    for (const intake of [familyIntake, workIntake]) {
      const params = new URLSearchParams(intakeSearchString(intake));
      const blank: PlanIntake = {
        ...intake,
        passports: [],
        motivation: null,
        workStatus: null,
        familyRelationship: null,
        familyJoineeStatus: null,
        studyStatus: null,
        durationIntent: null,
        companions: [],
      };
      expect(applyIntakeParams(blank, params)).toEqual(intake);
    }
  });
});

describe('applyIntakeParams', () => {
  it('URL wins over conflicting saved answers (family URL vs work localStorage)', () => {
    // Recipient's localStorage says "work / has-offer"; the shared URL says
    // "family / spouse". The URL must fully determine the plan.
    const params = new URLSearchParams('pp=us&m=family&rel=spouse&fs=settled&dur=long&co=children');
    const restored = applyIntakeParams(workIntake, params);
    expect(restored.motivation).toBe('family');
    expect(restored.familyRelationship).toBe('spouse');
    expect(restored.familyJoineeStatus).toBe('settled');
    // The stale work answer is reset, not merged in.
    expect(restored.workStatus).toBeNull();
    expect(restored.durationIntent).toBe('long');
    expect(restored.companions).toEqual(['children']);
  });

  it('keeps origin/destination from the base (page path), even if the URL is hand-edited', () => {
    const params = new URLSearchParams('m=work&origin=de&destination=fr');
    const restored = applyIntakeParams(familyIntake, params);
    expect(restored.origin).toBe('us');
    expect(restored.destination).toBe('ch');
  });

  it('drops junk enum values instead of storing them', () => {
    const params = new URLSearchParams('m=invade&ws=ceo&dur=forever&co=maybe');
    const restored = applyIntakeParams(familyIntake, params);
    expect(restored.motivation).toBeNull();
    expect(restored.workStatus).toBeNull();
    expect(restored.durationIntent).toBeNull();
    expect(restored.companions).toEqual([]);
  });

  it('validates and dedupes passports; falls back to the origin when all are junk', () => {
    const good = applyIntakeParams(familyIntake, new URLSearchParams('pp=US,in,us,zz'));
    expect(good.passports).toEqual(['us', 'in']); // case-folded, deduped, zz dropped

    const junk = applyIntakeParams(familyIntake, new URLSearchParams('pp=zz,xx&m=work'));
    expect(junk.passports).toEqual(['us']); // falls back to [origin]
  });
});

describe('hasIntakeParams', () => {
  it('detects any owned key and ignores foreign params', () => {
    expect(hasIntakeParams(new URLSearchParams('m=work'))).toBe(true);
    expect(hasIntakeParams(new URLSearchParams('co=partner'))).toBe(true);
    expect(hasIntakeParams(new URLSearchParams('utm_source=newsletter'))).toBe(false);
    expect(hasIntakeParams(new URLSearchParams(''))).toBe(false);
  });
});

describe('readIntakeParams', () => {
  it('reads the fragment (canonical, privacy-preserving carrier)', () => {
    const params = readIntakeParams({ search: '', hash: '#m=work&dur=long' });
    expect(params?.get('m')).toBe('work');
  });

  it('falls back to the query string for hand-built links', () => {
    const params = readIntakeParams({ search: '?m=study&ss=admitted', hash: '' });
    expect(params?.get('ss')).toBe('admitted');
  });

  it('prefers the fragment when both carry intake params', () => {
    const params = readIntakeParams({ search: '?m=work', hash: '#m=family' });
    expect(params?.get('m')).toBe('family');
  });

  it('returns null when neither carries intake params', () => {
    expect(readIntakeParams({ search: '?utm_source=x', hash: '#section' })).toBeNull();
    expect(readIntakeParams({ search: '', hash: '' })).toBeNull();
  });
});
