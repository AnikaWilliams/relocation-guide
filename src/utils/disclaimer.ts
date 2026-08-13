/**
 * Single-sourced legal disclaimer wording (CLAUDE.md rule 7).
 *
 * The exact text below is OWNED BY the `compliance-officer` agent — do not edit
 * the wording without compliance-officer sign-off. It mirrors, verbatim, the
 * sentences in `src/components/Disclaimer.astro` (the source of record for the
 * static no-JS pages and the site footer).
 *
 * Why this file exists: the React island (`CorridorApp.tsx`) cannot import an
 * Astro component, but the post-intake disclaimer modal must show the SAME
 * approved wording as the rest of the site. Keeping the sentences here, in one
 * plain string, lets the island reuse them without re-typing — so the wording
 * stays single-sourced. If the compliance wording changes, update BOTH this file
 * and `Disclaimer.astro` together.
 */

/** Lead sentence (bold on render) — matches Disclaimer.astro verbatim. */
export const DISCLAIMER_LEAD = 'This site provides general information only.';

/** Body sentences — matches Disclaimer.astro verbatim. */
export const DISCLAIMER_BODY =
  'It is not legal or immigration advice. Visa rules change frequently. Always verify requirements with the official authority or a licensed immigration adviser before taking action.';

/** Full plain-text disclaimer (lead + body), for screen readers / aria. */
export const DISCLAIMER_FULL = `${DISCLAIMER_LEAD} ${DISCLAIMER_BODY}`;

/**
 * Progress-tracking caveat — shown in the post-intake disclaimer modal AND in
 * each task's "Sources & legal notes" disclosure. Single-sourced here so the
 * exact wording cannot drift between the two places. Owned by compliance-officer;
 * do not edit the wording without sign-off.
 */
export const DISCLAIMER_PROGRESS_NOTE =
  'Marking a step done only records your own progress on this site — it is not confirmation that a legal requirement has been met or an application approved.';

/** Path to the Impressum (legal notice), reachable from the modal and footer. */
export const IMPRESSUM_PATH = '/impressum';
