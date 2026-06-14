/**
 * Country reference data — deliberately framework-agnostic (no `astro:content`
 * import) so it is safe to use from both Astro pages and client-side React
 * islands. `utils/corridors.ts` re-exports `COUNTRY_NAMES`/`countryName` so
 * existing server-side imports keep working.
 */

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

/**
 * Unicode flag emoji for an ISO 3166-1 alpha-2 code, formed from the two
 * regional-indicator symbols. Returns the empty string for codes that are not
 * two ASCII letters. Zero assets — the glyph is supplied by the OS/browser.
 */
export function flagEmoji(iso2: string): string {
  const cc = iso2.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return '';
  return String.fromCodePoint(
    ...[...cc].map((ch) => 0x1f1e6 + (ch.charCodeAt(0) - 65))
  );
}

export interface CountryOption {
  iso2: string;
  name: string;
  flag: string;
}

/** All in-scope countries as `{ iso2, name, flag }`, sorted by display name. */
export const COUNTRY_OPTIONS: CountryOption[] = Object.keys(COUNTRY_NAMES)
  .map((iso2) => ({ iso2, name: COUNTRY_NAMES[iso2], flag: flagEmoji(iso2) }))
  .sort((a, b) => a.name.localeCompare(b.name));
