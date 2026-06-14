import { describe, it, expect } from 'vitest';
import {
  CHAPTERS,
  ALL_CATEGORIES,
  chapterForCategory,
  compareChapters,
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
});
