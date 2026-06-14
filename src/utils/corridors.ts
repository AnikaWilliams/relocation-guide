import { getCollection, type CollectionEntry } from 'astro:content';
import { assertCorridorPublishable } from './provenance';

export type CorridorEntry = CollectionEntry<'corridors'>;

// Country reference data lives in a framework-agnostic module so React islands
// can import it too. Re-exported here for existing server-side call sites.
export { COUNTRY_NAMES, countryName, flagEmoji, COUNTRY_OPTIONS } from './countries';

/** An origin/destination pair (ISO2) for a published corridor. */
export interface CorridorPair {
  origin: string;
  destination: string;
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

/**
 * The `{ origin, destination }` pairs of every published corridor. The intake
 * wizard uses this to decide which countries are selectable (anything not in a
 * published corridor is shown greyed-out and unselectable).
 */
export async function getPublishedCorridorPairs(now: Date = new Date()): Promise<CorridorPair[]> {
  const published = await getPublishedCorridors(now);
  return published.map((entry) => ({
    origin: entry.data.originIso2,
    destination: entry.data.destinationIso2,
  }));
}
