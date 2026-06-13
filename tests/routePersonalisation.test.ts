/**
 * Route-personalisation regression suite (QA, F-10 follow-up).
 *
 * Loads the REAL us-ch corridor YAML and asserts, for representative intake
 * profiles, exactly which task ids the verified `appliesIf` rules admit.
 * This locks the three-route behaviour (work + family + retirement,
 * ADR-0009) against future content edits: adding, removing, or re-gating a
 * task in `src/content/corridors/us-ch.yaml` will fail here until the
 * expected set is consciously updated alongside a fact-verifier review.
 *
 * Uses the production evaluator (`evaluateAppliesIf`) and the production
 * schema (`CorridorSchema`) — no mocks, no re-implementation of the grammar.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { CorridorSchema, type Corridor } from '../src/content/schema';
import { evaluateAppliesIf, type AppliesIfContext } from '../src/utils/appliesIf';
import { topoOrder } from '../src/utils/journey';

const yamlPath = fileURLToPath(new URL('../src/content/corridors/us-ch.yaml', import.meta.url));
const corridor: Corridor = CorridorSchema.parse(parse(readFileSync(yamlPath, 'utf8')));

/** Mirrors the context CorridorApp builds from the intake answers. */
function ctx(overrides: Partial<AppliesIfContext> = {}): AppliesIfContext {
  return {
    origin: 'us',
    destination: 'ch',
    passports: ['us'],
    motivation: null,
    workStatus: null,
    familyRelationship: null,
    familyJoineeStatus: null,
    studyStatus: null,
    durationIntent: 'long',
    hasChildren: false,
    ...overrides,
  };
}

function applicableIds(c: AppliesIfContext): string[] {
  return corridor.tasks
    .filter((t) => evaluateAppliesIf(t.appliesIf, c).applies)
    .map((t) => t.id)
    .sort();
}

const sorted = (ids: string[]) => [...ids].sort();

/** Tasks with no appliesIf — apply to every route. */
const SHARED_CORE = [
  'register-commune',
  'residence-permit-card',
  'health-insurance',
];
/**
 * The employee-framed OASI task applies to every route EXCEPT retirement
 * (appliesIf "motivation != 'retirement'", fact-verifier approved 2026-06-12 —
 * Art. 28 retirees may not work, so retirees get retirement-ahv-contributions
 * instead).
 */
const SHARED = [...SHARED_CORE, 'ahv-social-security'];
const WORK = ['work-residence-permit', 'national-d-visa'];
const ALL_FAMILY_PERMITS = [
  'family-permit-spouse-swiss',
  'family-permit-spouse-settled',
  'family-permit-spouse-b-holder',
  'family-permit-unmarried-partner',
  'family-permit-children',
];
const RETIREMENT = [
  'retirement-residence-permit',
  'retirement-d-visa',
  'retirement-ahv-contributions',
];
/** Study tasks that apply to every study user (motivation == 'study'). */
const STUDY_COMMON = [
  'study-residence-permit',
  'study-d-visa',
  'study-work-alongside',
  'study-health-insurance-exemption',
  'study-after-graduation',
];
/** Additionally shown only while still applying (studyStatus == 'applying'). */
const STUDY_APPLYING_ONLY = ['study-admission'];

describe('us-ch corridor content (preconditions)', () => {
  it('contains exactly the known task ids (update the route expectations when this changes)', () => {
    expect(corridor.tasks.map((t) => t.id).sort()).toEqual(
      sorted([
        ...WORK,
        ...SHARED,
        ...ALL_FAMILY_PERMITS,
        'family-d-visa',
        ...RETIREMENT,
        ...STUDY_COMMON,
        ...STUDY_APPLYING_ONLY,
      ]),
    );
  });

  it('covers the work, family, retirement, and study motivations', () => {
    expect(corridor.coversMotivations).toEqual(['work', 'family', 'retirement', 'study']);
  });

  it('every appliesIf expression parses cleanly (no silent fail-open)', () => {
    // Fail-open hides parse errors from users; the suite must surface them.
    const fullCtx = ctx({
      motivation: 'family',
      workStatus: 'has-offer',
      familyRelationship: 'spouse',
      familyJoineeStatus: 'citizen',
      hasChildren: true,
    });
    for (const t of corridor.tasks) {
      const r = evaluateAppliesIf(t.appliesIf, fullCtx);
      expect(r.error, `task "${t.id}" appliesIf "${t.appliesIf}"`).toBeUndefined();
    }
  });
});

describe('route personalisation — applicable task ids per intake profile', () => {
  it('work / has-offer, no children → work tasks + shared, no family tasks', () => {
    const ids = applicableIds(ctx({ motivation: 'work', workStatus: 'has-offer' }));
    expect(ids).toEqual(sorted([...WORK, ...SHARED]));
  });

  it('work / job-seeking, no children → same gating as has-offer (workStatus does not gate tasks)', () => {
    const ids = applicableIds(ctx({ motivation: 'work', workStatus: 'job-seeking' }));
    expect(ids).toEqual(sorted([...WORK, ...SHARED]));
  });

  it('work / has-offer + children → adds ONLY the children task (no family visa/permit tasks)', () => {
    const ids = applicableIds(ctx({ motivation: 'work', workStatus: 'has-offer', hasChildren: true }));
    expect(ids).toEqual(sorted([...WORK, ...SHARED, 'family-permit-children']));
    expect(ids).not.toContain('family-d-visa');
  });

  it('family / spouse of a Swiss citizen → spouse-citizen permit + family D visa + shared, no work entry tasks', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'spouse', familyJoineeStatus: 'citizen' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-spouse-swiss', 'family-d-visa']));
    expect(ids).not.toContain('work-residence-permit');
    expect(ids).not.toContain('national-d-visa');
  });

  it('family / registered partner of a Swiss citizen → same task as spouse (Art. 52 FNIA route)', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'registered-partner', familyJoineeStatus: 'citizen' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-spouse-swiss', 'family-d-visa']));
  });

  it('family / spouse of a settled (C permit) person → spouse-settled permit task', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'spouse', familyJoineeStatus: 'settled' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-spouse-settled', 'family-d-visa']));
  });

  it('family / spouse of a B-permit holder → spouse-b-holder permit task', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'spouse', familyJoineeStatus: 'permit-holder' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-spouse-b-holder', 'family-d-visa']));
  });

  it('family / unmarried partner → concubinage task only, even when the partner is a Swiss citizen', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'unmarried-partner', familyJoineeStatus: 'citizen' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-unmarried-partner', 'family-d-visa']));
    // The relationship guard must beat the joinee-status match:
    expect(ids).not.toContain('family-permit-spouse-swiss');
  });

  it('family / parent-or-child constellation → routed to the children/dependants task, no spouse tasks', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'parent', familyJoineeStatus: 'citizen' }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-children', 'family-d-visa']));
  });

  it('family / spouse of a Swiss citizen + children → spouse task AND children task', () => {
    const ids = applicableIds(ctx({ motivation: 'family', familyRelationship: 'spouse', familyJoineeStatus: 'citizen', hasChildren: true }));
    expect(ids).toEqual(sorted([...SHARED, 'family-permit-spouse-swiss', 'family-permit-children', 'family-d-visa']));
  });

  it('unanswered intake (fresh wizard) → only unconditional shared tasks apply', () => {
    expect(applicableIds(ctx({ durationIntent: null, hasChildren: null }))).toEqual(sorted(SHARED));
  });

  it('retirement → retirement tasks + shared core, employee OASI task excluded', () => {
    const ids = applicableIds(ctx({ motivation: 'retirement' }));
    expect(ids).toEqual(sorted([...RETIREMENT, ...SHARED_CORE]));
    expect(ids).not.toContain('ahv-social-security');
    expect(ids).not.toContain('work-residence-permit');
    expect(ids).not.toContain('family-d-visa');
  });

  it('retirement + children → adds the (motivation-independent) children task', () => {
    const ids = applicableIds(ctx({ motivation: 'retirement', hasChildren: true }));
    expect(ids).toEqual(sorted([...RETIREMENT, ...SHARED_CORE, 'family-permit-children']));
  });

  it('study / admitted → study tasks + shared, no admission task, no work/family entry tasks', () => {
    const ids = applicableIds(ctx({ motivation: 'study', studyStatus: 'admitted' }));
    expect(ids).toEqual(sorted([...STUDY_COMMON, ...SHARED]));
    expect(ids).not.toContain('study-admission');
    expect(ids).not.toContain('work-residence-permit');
    expect(ids).not.toContain('family-d-visa');
  });

  it('study / still applying → adds the admission task', () => {
    const ids = applicableIds(ctx({ motivation: 'study', studyStatus: 'applying' }));
    expect(ids).toEqual(sorted([...STUDY_COMMON, ...STUDY_APPLYING_ONLY, ...SHARED]));
  });
});

describe('route personalisation — journey ordering over the filtered set', () => {
  it('work route: permit → D visa → commune registration, with cross-route dependsOn ids ignored', () => {
    const applicable = corridor.tasks.filter(
      (t) => evaluateAppliesIf(t.appliesIf, ctx({ motivation: 'work', workStatus: 'has-offer' })).applies,
    );
    const order = topoOrder(applicable).map((t) => t.id);
    expect(order.indexOf('work-residence-permit')).toBeLessThan(order.indexOf('national-d-visa'));
    // register-commune also dependsOn family-d-visa, which is filtered out here —
    // it must still unlock after the work-route visa alone.
    expect(order.indexOf('national-d-visa')).toBeLessThan(order.indexOf('register-commune'));
  });

  it('family route: route permit → family D visa → commune registration', () => {
    const applicable = corridor.tasks.filter(
      (t) => evaluateAppliesIf(t.appliesIf, ctx({ motivation: 'family', familyRelationship: 'spouse', familyJoineeStatus: 'citizen' })).applies,
    );
    const order = topoOrder(applicable).map((t) => t.id);
    expect(order.indexOf('family-permit-spouse-swiss')).toBeLessThan(order.indexOf('family-d-visa'));
    expect(order.indexOf('family-d-visa')).toBeLessThan(order.indexOf('register-commune'));
  });

  it('retirement route: permit → D visa → commune registration → OASI contributions', () => {
    const applicable = corridor.tasks.filter(
      (t) => evaluateAppliesIf(t.appliesIf, ctx({ motivation: 'retirement' })).applies,
    );
    const order = topoOrder(applicable).map((t) => t.id);
    expect(order.indexOf('retirement-residence-permit')).toBeLessThan(order.indexOf('retirement-d-visa'));
    expect(order.indexOf('retirement-d-visa')).toBeLessThan(order.indexOf('register-commune'));
    expect(order.indexOf('register-commune')).toBeLessThan(order.indexOf('retirement-ahv-contributions'));
  });
});
