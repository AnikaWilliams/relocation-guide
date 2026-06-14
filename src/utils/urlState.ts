/**
 * F-08 — URL state encoding for the intake profile (shareable plans).
 *
 * While the plan ("app" phase) is showing, the plan-affecting intake answers
 * are mirrored into a compact param string carried in the URL **fragment**,
 * so a plan can be shared or bookmarked, e.g.:
 *
 *   /us/ch/#pp=us&m=family&rel=unmarried-partner&fs=citizen&dur=long&co=children
 *
 * Why the fragment and not `?` search params: compliance ruling on share
 * links (2026-06-12, see FOUNDER-TLDR) — intake answers can be sensitive
 * (passports held, family relationship can reveal sexual orientation) and
 * **must never reach our servers**. Browsers never transmit the fragment in
 * HTTP requests, so the profile stays on the client (no host/CDN request
 * logs, no analytics page_location). For compatibility, the same params ARE
 * accepted from the query string on read (`readIntakeParams`) — e.g. a
 * hand-built `?m=work` link — and the app immediately canonicalises the URL
 * to the fragment form.
 *
 * Deliberate exclusions:
 * - **Origin/destination** are NOT params — they already live in the path
 *   (`/us/ch/`), and the path decides which corridor content is served.
 * - **Free-text answers** (employer name/location, institution, "other"
 *   description) are NOT encoded — also a compliance requirement: they never
 *   change which tasks apply, and personal details don't belong in a
 *   shareable URL. They stay in localStorage only.
 *
 * Restore precedence (applied in the island's mount effect — never during the
 * first render, which must match the server HTML): URL > localStorage >
 * defaults. When a URL carries *any* intake param, the URL becomes the sole
 * source of truth for every plan-affecting answer (missing params fall back
 * to defaults, not to localStorage), so a shared link reproduces the sharer's
 * plan exactly even when the recipient has different saved answers.
 *
 * All encoded values are lowercase `[a-z0-9-]` enums (plus `,` between
 * passport codes), so the query string needs no percent-encoding and stays
 * human-readable. Unknown or invalid values are ignored on decode.
 */

import { COUNTRY_NAMES } from './countries';
import { isCantonCode } from './cantons';

/** The subset of the intake that decides which tasks apply (plan-affecting). */
export interface PlanIntake {
  origin: string | null;
  destination: string | null;
  passports: string[];
  motivation: 'work' | 'family' | 'study' | 'retirement' | 'other' | null;
  workStatus: 'has-offer' | 'job-seeking' | null;
  familyRelationship: 'spouse' | 'registered-partner' | 'unmarried-partner' | 'parent' | null;
  familyJoineeStatus: 'citizen' | 'settled' | 'permit-holder' | 'other' | null;
  studyStatus: 'admitted' | 'applying' | null;
  durationIntent: 'short' | 'long' | 'permanent' | null;
  /** Dependants moving with the applicant (the "who's joining you?" step). */
  companions: ('partner' | 'children')[];
  /**
   * Swiss canton the user is moving to (lowercased ISO 3166-2:CH code), or
   * null when unknown / the destination isn't Switzerland. Only encoded for
   * CH destinations — permits/taxes are administered cantonally (ADR-0021).
   */
  canton: string | null;
}

/** Every search-param key this module owns. Anything else in the URL is left alone. */
export const INTAKE_PARAM_KEYS = ['pp', 'm', 'ws', 'rel', 'fs', 'ss', 'dur', 'co', 'cn'] as const;

// Allowed values per enum param (decode validation — junk values are dropped).
const MOTIVATION_VALUES = ['work', 'family', 'study', 'retirement', 'other'] as const;
const WORK_STATUS_VALUES = ['has-offer', 'job-seeking'] as const;
const FAMILY_REL_VALUES = ['spouse', 'registered-partner', 'unmarried-partner', 'parent'] as const;
const FAMILY_STATUS_VALUES = ['citizen', 'settled', 'permit-holder', 'other'] as const;
const STUDY_STATUS_VALUES = ['admitted', 'applying'] as const;
const DURATION_VALUES = ['short', 'long', 'permanent'] as const;
const COMPANION_VALUES = ['partner', 'children'] as const;

/** Does the URL carry any intake state at all? */
export function hasIntakeParams(params: URLSearchParams): boolean {
  return INTAKE_PARAM_KEYS.some((k) => params.has(k));
}

/**
 * Extract intake params from a location, or `null` when it carries none.
 * The fragment is the canonical carrier (privacy: never sent to servers);
 * the query string is accepted as a fallback for hand-built links. When both
 * carry intake params, the fragment wins.
 */
export function readIntakeParams(loc: { search: string; hash: string }): URLSearchParams | null {
  const fromHash = new URLSearchParams(loc.hash.replace(/^#/, ''));
  if (hasIntakeParams(fromHash)) return fromHash;
  const fromSearch = new URLSearchParams(loc.search);
  if (hasIntakeParams(fromSearch)) return fromSearch;
  return null;
}

/**
 * Encode the plan-affecting answers as ordered `[key, value]` pairs.
 * Unanswered fields and branch fields outside the chosen motivation are
 * omitted, keeping the URL canonical for a given plan.
 */
export function intakeToParams(a: PlanIntake): [string, string][] {
  const out: [string, string][] = [];
  if (a.passports.length > 0) out.push(['pp', a.passports.join(',')]);
  if (a.motivation) out.push(['m', a.motivation]);
  if (a.motivation === 'work' && a.workStatus) out.push(['ws', a.workStatus]);
  if (a.motivation === 'family') {
    if (a.familyRelationship) out.push(['rel', a.familyRelationship]);
    if (a.familyJoineeStatus) out.push(['fs', a.familyJoineeStatus]);
  }
  if (a.motivation === 'study' && a.studyStatus) out.push(['ss', a.studyStatus]);
  if (a.durationIntent) out.push(['dur', a.durationIntent]);
  if (a.companions.length > 0) out.push(['co', a.companions.join(',')]);
  // Canton only travels for Switzerland (the only cantonally-administered
  // destination today) and only when it's a known code — junk never encodes.
  if (a.destination === 'ch' && a.canton && isCantonCode(a.canton)) out.push(['cn', a.canton]);
  return out;
}

/** Encode as a ready-to-append query string (no leading `?`), e.g. `pp=us&m=work&dur=long&co=partner,children`. */
export function intakeSearchString(a: PlanIntake): string {
  return intakeToParams(a)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
}

function pickEnum<T extends string>(
  params: URLSearchParams,
  key: string,
  allowed: readonly T[],
): T | null {
  const v = params.get(key);
  return v !== null && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

/**
 * Apply URL intake params on top of `base`, returning a new intake.
 *
 * Every plan-affecting field is taken from the URL (or reset to its default
 * when absent/invalid) — `base` only contributes origin/destination (which
 * come from the page path) and the non-plan fields (free text), so a shared
 * URL deterministically reproduces the sharer's plan. Call this only when
 * `hasIntakeParams(params)` is true.
 */
export function applyIntakeParams<T extends PlanIntake>(base: T, params: URLSearchParams): T {
  const defaultPassports = base.origin ? [base.origin] : [];
  const pp = (params.get('pp') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((iso, i, arr) => iso in COUNTRY_NAMES && arr.indexOf(iso) === i);
  const companions = (params.get('co') ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((v, i, arr): v is (typeof COMPANION_VALUES)[number] =>
      (COMPANION_VALUES as readonly string[]).includes(v) && arr.indexOf(v) === i);
  // Canton: only meaningful for Switzerland (its destination lives in the page
  // path → on `base`); validated against the known codes, else null.
  const cnRaw = (params.get('cn') ?? '').trim().toLowerCase();
  const canton = base.destination === 'ch' && isCantonCode(cnRaw) ? cnRaw : null;
  return {
    ...base,
    passports: pp.length > 0 ? pp : defaultPassports,
    motivation: pickEnum(params, 'm', MOTIVATION_VALUES),
    workStatus: pickEnum(params, 'ws', WORK_STATUS_VALUES),
    familyRelationship: pickEnum(params, 'rel', FAMILY_REL_VALUES),
    familyJoineeStatus: pickEnum(params, 'fs', FAMILY_STATUS_VALUES),
    studyStatus: pickEnum(params, 'ss', STUDY_STATUS_VALUES),
    durationIntent: pickEnum(params, 'dur', DURATION_VALUES),
    companions,
    canton,
  };
}
