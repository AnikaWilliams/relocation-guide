import { describe, it, expect } from 'vitest';
import {
  CHAPTERS,
  ALL_CATEGORIES,
  chapterForCategory,
  compareChapters,
  groupTasksByChapter,
} from '../src/utils/journeyChapters';

describe('journeyChapters', () => {
  it('maps every schema category to a known chapter', () => {
    const knownIds = new Set(CHAPTERS.map((c) => c.id));
    for (const cat of ALL_CATEGORIES) {
      const chapter = chapterForCategory(cat);
      expect(knownIds.has(chapter.id)).toBe(true);
    }
  });

  it('falls back to a neutral chapter for an unmapped category', () => {
    // A stray/legacy category string must not crash the visual path.
    const chapter = chapterForCategory('not-a-real-category');
    expect(chapter).toBeDefined();
    expect(chapter.label.length).toBeGreaterThan(0);
  });

  it('keeps the permit chapter before the settling-in chapter', () => {
    const permit = chapterForCategory('visa-permit');
    const settling = chapterForCategory('taxes');
    expect(compareChapters(permit, settling)).toBeLessThan(0);
  });

  it('uses neutral chapter labels (no outcome/approval wording)', () => {
    // Trust guard: chapter labels must never imply an authority's decision.
    const banned = ['approved', 'ready to move', 'all set', 'complete', 'done', 'guaranteed'];
    for (const c of CHAPTERS) {
      const haystack = `${c.label} ${c.why}`.toLowerCase();
      for (const word of banned) {
        expect(haystack.includes(word)).toBe(false);
      }
    }
  });

  it('keeps the topological order when grouping tasks by chapter', () => {
    // Mirrors the US→Ireland work route: the permit task (visa-permit chapter)
    // precedes its dependent (employment category → "before-you-go"), so the
    // dependent must NOT be hoisted above its prerequisite by chapter sorting.
    const tasks = [
      { id: 'employment-permit', category: 'visa-permit' },
      { id: 'employment-permit-type', category: 'employment' },
      { id: 'entry-permission', category: 'visa-permit' },
      { id: 'register-immigration-irp', category: 'registration-bureaucracy' },
    ];
    const groups = groupTasksByChapter(tasks);
    // The dependency-respecting order is preserved end-to-end.
    const flat = groups.flatMap((g) => g.items.map((i) => i.task.id));
    expect(flat).toEqual(tasks.map((t) => t.id));
    // Global step indices run 1..N across the whole journey.
    expect(groups.flatMap((g) => g.items.map((i) => i.stepIndex))).toEqual([1, 2, 3, 4]);
    // The non-contiguous "your-permit" run is split into two groups, each
    // with a unique run key so React can render them without collisions.
    const permitRuns = groups.filter((g) => g.chapter.id === 'your-permit');
    expect(permitRuns.length).toBe(2);
    expect(new Set(permitRuns.map((g) => g.runKey)).size).toBe(2);
    expect(permitRuns[0].items.map((i) => i.task.id)).toEqual(['employment-permit']);
    expect(permitRuns[1].items.map((i) => i.task.id)).toEqual(['entry-permission']);
  });
});
