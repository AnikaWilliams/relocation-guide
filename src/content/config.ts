import { defineCollection } from 'astro:content';
import { CorridorSchema } from './schema';

/**
 * Corridors are structured data, one file per origin->destination pair, living
 * directly under `src/content/corridors/` (e.g. `in-de.yaml`, `us-ch.yaml`).
 * Adding a corridor = adding a file. Zero code changes required (ADR-0005).
 *
 * The Zod schema makes the provenance fields part of the type, so a corridor
 * file that omits required structure fails at content-collection compile time.
 * Freshness/verification enforcement happens in the build gate at render time
 * (see src/utils/provenance.ts).
 */
const corridors = defineCollection({
  type: 'data',
  schema: CorridorSchema,
});

export const collections = { corridors };
