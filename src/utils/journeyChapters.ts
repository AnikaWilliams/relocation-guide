/**
 * Authored category → chapter map for the visual "Your journey" path.
 *
 * The corridor schema groups every task under one of the 12 `CategoryEnum`
 * values (see `src/content/schema.ts`). For the visual journey map we want a
 * SMALLER, human-readable set of named *chapters* that follow the real legal /
 * logistical sequence of a relocation — "Before you go" → "Your permit" →
 * "After you arrive" → "Settling in". Several schema categories collapse into
 * one chapter (e.g. registration + finance + healthcare all happen "after you
 * arrive").
 *
 * IMPORTANT — trust constraints (this is a projection, not new content):
 * - Chapter labels are NEUTRAL and FACTUAL, tied to the real sequence of a
 *   move. They make NO promise about outcomes ("approved", "ready to move",
 *   "all set" are banned — those imply an authority's decision). They only
 *   describe what stage of the user's OWN actions a task belongs to.
 * - This map asserts no fact, fee, or legal claim, so it carries no provenance.
 *   It is pure presentation, exactly like `CategoryBadge`'s colour map.
 *
 * Every value of `CategoryEnum` is mapped below; `chapterForCategory` also has a
 * graceful fallback so an unmapped/typo'd category never crashes the map — it
 * lands in the neutral "Other steps" chapter at the end.
 *
 * Framework-agnostic (no React, no astro:content) so it can be unit-tested.
 */

import { CategoryEnum, type Category } from '../content/schema';

export interface Chapter {
  /** Stable id used as a React key and for grouping. */
  id: string;
  /** Neutral, factual label shown above a group of task nodes. */
  label: string;
  /**
   * Plain-English "why this stage matters", phrased as the USER's stage of the
   * move — never as an authority's verdict. Used by the per-chapter milestone
   * note when the user finishes the last task of a chapter.
   */
  why: string;
  /** Sort order; lower comes first. */
  order: number;
}

/** The ordered set of chapters. Order follows the real relocation sequence. */
export const CHAPTERS: Chapter[] = [
  {
    id: 'before-you-go',
    label: 'Before you go',
    why: 'the groundwork you do before leaving is in hand',
    order: 0,
  },
  {
    id: 'your-permit',
    label: 'Your permit',
    why: 'you have worked through the permit and entry steps for your route',
    order: 1,
  },
  {
    id: 'after-you-arrive',
    label: 'After you arrive',
    why: 'you have covered the first things to set up once you land',
    order: 2,
  },
  {
    id: 'settling-in',
    label: 'Settling in',
    why: 'you have worked through the longer-term steps of settling in',
    order: 3,
  },
  // Fallback chapter — kept last so any future/unmapped category still renders
  // somewhere sensible rather than disappearing or breaking the path.
  {
    id: 'other-steps',
    label: 'Other steps',
    why: 'you have worked through the remaining steps in your plan',
    order: 4,
  },
];

const CHAPTER_BY_ID: Record<string, Chapter> = Object.fromEntries(
  CHAPTERS.map((c) => [c.id, c]),
);

/**
 * Which chapter each schema category belongs to. EVERY `CategoryEnum` value
 * appears here — keep this exhaustive (the unit test asserts it).
 */
const CATEGORY_TO_CHAPTER_ID: Record<Category, string> = {
  // Reason for the move + the offer/admission that precedes leaving.
  employment: 'before-you-go',
  education: 'before-you-go',
  // The permit / visa itself — the legal right to enter and stay.
  'visa-permit': 'your-permit',
  // First things once you land: register your address, open a bank account,
  // arrange health cover, find somewhere to live.
  'registration-bureaucracy': 'after-you-arrive',
  'finance-banking': 'after-you-arrive',
  'healthcare-insurance': 'after-you-arrive',
  housing: 'after-you-arrive',
  // Longer-term life: taxes, bringing family, transport, language/integration.
  taxes: 'settling-in',
  'family-dependents': 'settling-in',
  'transport-logistics': 'settling-in',
  'language-integration': 'settling-in',
  // Genuinely uncategorised work.
  other: 'other-steps',
};

/**
 * Resolve a task's category to its chapter. Falls back to the neutral
 * "Other steps" chapter for any value not in the map (defensive — the schema
 * enum is exhaustively mapped above, but a stray/legacy string must not crash
 * the visual path).
 */
export function chapterForCategory(category: string): Chapter {
  const id = CATEGORY_TO_CHAPTER_ID[category as Category] ?? 'other-steps';
  return CHAPTER_BY_ID[id] ?? CHAPTER_BY_ID['other-steps'];
}

/** Sort comparator placing chapters in their authored relocation order. */
export function compareChapters(a: Chapter, b: Chapter): number {
  return a.order - b.order;
}

/** Every category the schema enum can produce — exported for the exhaustiveness test. */
export const ALL_CATEGORIES = CategoryEnum.options;
