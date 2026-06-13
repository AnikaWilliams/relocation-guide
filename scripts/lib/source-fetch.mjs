/**
 * Shared source fetch for the snapshot tooling (ADR-0017).
 *
 * ONE fetch implementation, used by BOTH snapshot-source (capture) and
 * check-sources (drift detection), so the two can never diverge — if they
 * fetched differently, a drift comparison would be meaningless.
 *
 * Robust metadata parsing: curl's `-w` output is appended to the body on stdout.
 * Reading the HTTP code / content-type out of that mixed stream with a trailing
 * regex proved fragile — it broke on content-types carrying a charset with a
 * space ("text/html; charset=utf-8"), and could be fooled by a body ending in
 * digits. Instead we emit the metadata on its own line behind a unique sentinel,
 * tab-separated, and read it from the LAST occurrence — so spaces, semicolons,
 * and body content cannot fool it.
 *
 * User-Agent: some official sites (e.g. france-visas.gouv.fr,
 * citizensinformation.ie) return 403 to a User-Agent-less curl but 200 to a
 * browser UA. We fetch public official information pages for citation; a
 * realistic UA gets past over-aggressive bot filters on public content (this is
 * not auth / paywall / CAPTCHA circumvention). Override with the SNAPSHOT_UA env
 * var — but keep it identical across capture and check, or drift goes false.
 */

import { spawnSync } from 'node:child_process';

export const SOURCE_FETCH_UA =
  process.env.SNAPSHOT_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/** Newline-prefixed sentinel that will not occur in a real page body. */
const META = '__SNAPSHOT_META_8f3a1c__';

/**
 * Fetch a URL via local curl (residential IP — dodges the datacenter-IP block on
 * government sites that defeats agent WebFetch).
 *
 * @param {string} url
 * @param {{ timeoutS?: number }} [opts]
 * @returns {{ body: string, rawBytes: Buffer, contentType: string, httpCode: number }}
 * @throws on curl failure, HTTP >= 400, or empty body — the caller treats a throw
 *   as "uncapturable" and keeps the claim UNVERIFIED rather than citing nothing.
 */
export function fetchSource(url, { timeoutS = 30 } = {}) {
  const res = spawnSync(
    'curl',
    [
      '-sL', // silent, follow redirects
      '-A',
      SOURCE_FETCH_UA,
      '--max-time',
      String(timeoutS),
      // metadata on its own sentinel line, tab-separated, AFTER the body.
      // curl interprets the \n and \t escapes in the -w format string.
      '-w',
      `\\n${META}%{http_code}\\t%{content_type}`,
      url,
    ],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  );

  if (res.error) throw new Error(`curl could not run: ${res.error.message}`);
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString('utf8').trim() : '';
    throw new Error(`curl exited ${res.status}${stderr ? ` — ${stderr}` : ''} (unreachable: ${url})`);
  }

  const full = (res.stdout ?? Buffer.alloc(0)).toString('utf8');
  const marker = `\n${META}`;
  const idx = full.lastIndexOf(marker);
  if (idx === -1) throw new Error(`could not read curl metadata for ${url}`);

  const meta = full.slice(idx + marker.length); // "<code>\t<content-type>"
  const tab = meta.indexOf('\t');
  const httpCode = Number((tab >= 0 ? meta.slice(0, tab) : meta).trim()) || 0;
  const contentType = (tab >= 0 ? meta.slice(tab + 1) : '').trim();
  const body = full.slice(0, idx);

  if (!httpCode || httpCode >= 400) throw new Error(`HTTP ${httpCode || '???'} fetching ${url}`);
  if (!body.trim()) throw new Error(`empty body from ${url}`);

  return { body, rawBytes: Buffer.from(body, 'utf8'), contentType, httpCode };
}
