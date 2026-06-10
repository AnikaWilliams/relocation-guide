import { getCollection, type CollectionEntry } from 'astro:content';
import { assertCorridorPublishable } from './provenance';

export type CorridorEntry = CollectionEntry<'corridors'>;

/**
 * Display names for the ISO 3166-1 alpha-2 codes in the approved content scope
 * (CLAUDE.md / ADR-0003). Note: the UK is `gb`.
 */
export const COUNTRY_NAMES: Record<string, string> = {
  // Origins
  in: 'India',
  us: 'United States',
  gb: 'United Kingdom',
  ca: 'Canada',
  au: 'Australia',
  ph: 'Philippines',
  cn: 'China',
  rs: 'Serbia',
  ru: 'Russia',
  ua: 'Ukraine',
  // Destinations (Western Europe)
  ch: 'Switzerland',
  de: 'Germany',
  fr: 'France',
  nl: 'Netherlands',
  ie: 'Ireland',
  at: 'Austria',
  be: 'Belgium',
  lu: 'Luxembourg',
};

export function countryName(iso2: string): string {
  return COUNTRY_NAMES[iso2.toLowerCase()] ?? iso2.toUpperCase();
}

/** The corridor slug, e.g. `in-de`. */
export function corridorSlug(entry: CorridorEntry): string {
  return `${entry.data.originIso2}-${entry.data.destinationIso2}`.toLowerCase();
}

/**
 * Every corridor marked `published: true`, with the provenance gate applied.
 * Throws (failing the build) if a published corridor has an unrenderable claim.
 */
export async function getPublishedCorridors(now: Date = new Date()): Promise<CorridorEntry[]> {
  const all = await getCollection('corridors');
  const published = all.filter((entry) => entry.data.published);
  for (const entry of published) {
    assertCorridorPublishable(entry.data, now);
  }
  return published;
}
