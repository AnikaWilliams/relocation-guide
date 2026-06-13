/**
 * Route availability — the single source of truth for "is this corridor live?".
 *
 * Framework-agnostic (no `astro:content` import) so the React intake island and
 * the server pages can both use it, and it is trivially unit-testable across the
 * full country matrix. A route is "live" iff a published corridor exists for that
 * exact origin→destination pair; every other pair routes to the launch waitlist.
 */

/** A published origin→destination pair (ISO2). */
export interface RoutePair {
  origin: string;
  destination: string;
}

/** Is there a published corridor for this exact origin→destination pair? */
export function isRouteLive(
  pairs: readonly RoutePair[],
  origin: string | null | undefined,
  destination: string | null | undefined,
): boolean {
  if (!origin || !destination) return false;
  return pairs.some((p) => p.origin === origin && p.destination === destination);
}
