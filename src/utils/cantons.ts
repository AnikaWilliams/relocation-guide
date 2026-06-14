/**
 * Swiss canton reference data — deliberately framework-agnostic (no
 * `astro:content` import) so it is safe to use from both Astro pages and
 * client-side React islands, exactly like `utils/countries.ts`.
 *
 * Switzerland administers permits, taxes, and registration cantonally (federal
 * law, cantonal administration — ADR-0021), so the intake asks which canton the
 * user is moving to and the plan surfaces that canton's local detail. This file
 * is the canonical list of the 26 cantons; the per-canton CONTENT (migration
 * office, tax authority, …) is provenance-gated corridor content and lives in
 * `src/content/`, not here.
 */

export interface CantonOption {
  /** Lowercased ISO 3166-2:CH subdivision code, e.g. 'zh', 'ge', 'vd'. */
  code: string;
  name: string;
}

/** The 26 Swiss cantons, sorted by display name. */
export const CH_CANTONS: CantonOption[] = [
  { code: 'ag', name: 'Aargau' },
  { code: 'ai', name: 'Appenzell Innerrhoden' },
  { code: 'ar', name: 'Appenzell Ausserrhoden' },
  { code: 'be', name: 'Bern' },
  { code: 'bl', name: 'Basel-Landschaft' },
  { code: 'bs', name: 'Basel-Stadt' },
  { code: 'fr', name: 'Fribourg' },
  { code: 'ge', name: 'Geneva' },
  { code: 'gl', name: 'Glarus' },
  { code: 'gr', name: 'Graubünden' },
  { code: 'ju', name: 'Jura' },
  { code: 'lu', name: 'Lucerne' },
  { code: 'ne', name: 'Neuchâtel' },
  { code: 'nw', name: 'Nidwalden' },
  { code: 'ow', name: 'Obwalden' },
  { code: 'sg', name: 'St. Gallen' },
  { code: 'sh', name: 'Schaffhausen' },
  { code: 'so', name: 'Solothurn' },
  { code: 'sz', name: 'Schwyz' },
  { code: 'tg', name: 'Thurgau' },
  { code: 'ti', name: 'Ticino' },
  { code: 'ur', name: 'Uri' },
  { code: 'vd', name: 'Vaud' },
  { code: 'vs', name: 'Valais' },
  { code: 'zg', name: 'Zug' },
  { code: 'zh', name: 'Zürich' },
].sort((a, b) => a.name.localeCompare(b.name));

/** Every valid canton code (lowercased). */
export const CANTON_CODES: string[] = CH_CANTONS.map((c) => c.code);

const CANTON_NAMES: Record<string, string> = Object.fromEntries(
  CH_CANTONS.map((c) => [c.code, c.name]),
);

/** Human-readable canton name for a code; falls back to the upper-cased code. */
export function cantonName(code: string): string {
  return CANTON_NAMES[code.toLowerCase()] ?? code.toUpperCase();
}

/** Whether a string is a valid (known) canton code. */
export function isCantonCode(code: string): boolean {
  return code.toLowerCase() in CANTON_NAMES;
}

/**
 * Destinations whose rules are administered cantonally — the intake's canton
 * step only shows for these. Switzerland today; extensible if another federal
 * destination needs the same treatment.
 */
export const CANTONAL_DESTINATIONS = ['ch'] as const;
