/**
 * Cross-corridor plan-correctness audit (QA, content-regression).
 *
 * The us-ch suite (routePersonalisation.test.ts) locks one corridor in detail.
 * THIS suite is the safety net for EVERY published corridor: it loads each
 * `src/content/corridors/*.yaml`, builds the applicable-task set for a matrix of
 * intake profiles (using the production `evaluateAppliesIf`), and asserts the
 * personalisation invariants:
 *
 *   INV-D  No appliesIf expression may silently fail-open (parse error).
 *   INV-B  A non-study profile gets ZERO `education` tasks.
 *   INV-C  A non-retirement profile gets ZERO retirement-only tasks.
 *   INV-A  Nobody joining + not the family route → ZERO `family-dependents` tasks.
 *          (The founder-decided gating, ADR-0020: family steps show only when a
 *          partner/children are coming, or on the explicit family route.)
 *   INV-G  Child-specific tasks (id contains "child") require children.
 *   INV-E  Every general (no-appliesIf) task appears in every covered plan.
 *   INV-F  Under-inclusion guard: every covered motivation yields ≥1 tailored task.
 *   INV-H  Monotonicity: adding companions (partner/children) NEVER removes a
 *          task — guards the cardinal sin of hiding a step a mover needs.
 *
 * `hasChildren` is DERIVED from `companions` here, exactly as `CorridorApp` does,
 * so the test mirrors production. See `companions` ("who's joining you?") step.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { parse } from 'yaml';
import { CorridorSchema, type Corridor } from '../src/content/schema';
import { evaluateAppliesIf, type AppliesIfContext } from '../src/utils/appliesIf';

const dir = fileURLToPath(new URL('../src/content/corridors/', import.meta.url));
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));

const corridors: { file: string; corridor: Corridor }[] = files.map((file) => ({
  file,
  corridor: CorridorSchema.parse(parse(readFileSync(dir + file, 'utf8'))),
}));

const NON_FAMILY = ['work', 'study', 'retirement', 'other'] as const;

/** A representative intake context. `hasChildren` is derived from `companions`. */
function ctx(c: Corridor, overrides: Partial<AppliesIfContext> = {}): AppliesIfContext {
  const base: AppliesIfContext = {
    origin: c.originIso2,
    destination: c.destinationIso2,
    passports: [c.originIso2],
    motivation: null,
    workStatus: null,
    familyRelationship: null,
    familyJoineeStatus: null,
    studyStatus: null,
    durationIntent: 'long',
    companions: [],
    ...overrides,
  };
  const companions = (base.companions as string[]) ?? [];
  return { ...base, hasChildren: companions.includes('children') };
}

function applicableIds(c: Corridor, context: AppliesIfContext): string[] {
  return c.tasks.filter((t) => evaluateAppliesIf(t.appliesIf, context).applies).map((t) => t.id);
}
function applicable(c: Corridor, context: AppliesIfContext) {
  return c.tasks.filter((t) => evaluateAppliesIf(t.appliesIf, context).applies);
}

const isRetirementTask = (id: string, title: string) =>
  /retirement|pension|non-gainful/i.test(`${id} ${title}`);

describe('cross-corridor plan correctness', () => {
  it('audits every corridor yaml found', () => {
    expect(corridors.length).toBeGreaterThanOrEqual(8);
  });

  describe.each(corridors)('$file', ({ corridor }) => {
    const generalCount = corridor.tasks.filter((t) => !t.appliesIf || t.appliesIf.trim() === '').length;
    const covered = corridor.coversMotivations ?? ['work'];

    // INV-D — no silent fail-open under a fully-populated context.
    it('no appliesIf expression fails open (parse error)', () => {
      const full = ctx(corridor, {
        motivation: 'family', workStatus: 'has-offer', familyRelationship: 'spouse',
        familyJoineeStatus: 'citizen', studyStatus: 'applying', companions: ['partner', 'children'],
      });
      const broken = corridor.tasks
        .map((t) => ({ id: t.id, err: evaluateAppliesIf(t.appliesIf, full).error }))
        .filter((r) => r.err);
      expect(broken, `fail-open tasks: ${JSON.stringify(broken)}`).toEqual([]);
    });

    // INV-A — nobody joining + non-family route → no family-dependents tasks.
    it.each(NON_FAMILY)('%s, nobody joining → no family-dependents tasks', (motivation) => {
      const tasks = applicable(corridor, ctx(corridor, { motivation, studyStatus: 'admitted', companions: [] }));
      const leaked = tasks.filter((t) => t.category === 'family-dependents').map((t) => t.id);
      expect(leaked, `family tasks shown to a solo ${motivation} mover in ${corridor.title}`).toEqual([]);
    });

    // INV-B — only study plans get education tasks.
    it.each(['work', 'family', 'retirement', 'other'] as const)('%s → no education tasks', (motivation) => {
      const tasks = applicable(corridor, ctx(corridor, {
        motivation,
        familyRelationship: motivation === 'family' ? 'spouse' : null,
        familyJoineeStatus: motivation === 'family' ? 'citizen' : null,
      }));
      const leaked = tasks.filter((t) => t.category === 'education').map((t) => t.id);
      expect(leaked, `education leaked into the ${motivation} plan of ${corridor.title}`).toEqual([]);
    });

    // INV-C — retirement-only tasks must not appear for non-retirees.
    it.each(['work', 'study', 'family'] as const)('%s → no retirement-only tasks', (motivation) => {
      const tasks = applicable(corridor, ctx(corridor, {
        motivation, studyStatus: 'admitted',
        familyRelationship: motivation === 'family' ? 'spouse' : null,
        familyJoineeStatus: motivation === 'family' ? 'citizen' : null,
      }));
      const leaked = tasks.filter((t) => isRetirementTask(t.id, t.title)).map((t) => t.id);
      expect(leaked, `retirement leaked into the ${motivation} plan of ${corridor.title}`).toEqual([]);
    });

    // INV-G — child-specific tasks require children (no children coming → hidden).
    it.each(NON_FAMILY)('%s, no children coming → no child-specific task', (motivation) => {
      const tasks = applicable(corridor, ctx(corridor, { motivation, studyStatus: 'admitted', companions: [] }));
      const leaked = tasks.filter((t) => /child/i.test(t.id)).map((t) => t.id);
      expect(leaked, `child-specific task shown with no children in the ${motivation} plan of ${corridor.title}`).toEqual([]);
    });

    // INV-E — general (ungated) tasks appear in every covered plan.
    it('general (no-appliesIf) tasks appear for every covered motivation', () => {
      const general = corridor.tasks.filter((t) => !t.appliesIf || t.appliesIf.trim() === '').map((t) => t.id);
      for (const motivation of covered) {
        const ids = applicableIds(corridor, ctx(corridor, { motivation, studyStatus: 'admitted' }));
        for (const g of general) {
          expect(ids, `general task "${g}" missing from the ${motivation} plan of ${corridor.title}`).toContain(g);
        }
      }
    });

    // INV-F — every covered motivation gets a tailored path (under-inclusion guard).
    it('every covered motivation yields at least one motivation-specific task', () => {
      for (const motivation of covered) {
        const count = applicable(corridor, ctx(corridor, {
          motivation, studyStatus: 'admitted',
          familyRelationship: motivation === 'family' ? 'spouse' : null,
          familyJoineeStatus: motivation === 'family' ? 'citizen' : null,
        })).length;
        expect(count, `${motivation} plan of ${corridor.title} has no tailored task`).toBeGreaterThan(generalCount);
      }
    });

    // INV-H — adding companions never REMOVES a task (no hidden-step regression).
    it.each(['work', 'study'] as const)('%s: bringing a partner/children only adds tasks', (motivation) => {
      const solo = new Set(applicableIds(corridor, ctx(corridor, { motivation, studyStatus: 'admitted', companions: [] })));
      const withFamily = new Set(applicableIds(corridor, ctx(corridor, { motivation, studyStatus: 'admitted', companions: ['partner', 'children'] })));
      const removed = [...solo].filter((id) => !withFamily.has(id));
      expect(removed, `${corridor.title}: tasks vanished for a ${motivation} mover when family was added`).toEqual([]);
    });
  });
});
