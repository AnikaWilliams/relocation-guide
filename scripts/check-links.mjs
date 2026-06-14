#!/usr/bin/env node
/**
 * check-links.mjs — link-auditor CI script (Phase 3).
 *
 * Audits every `sourceUrl` in the corridors content collection:
 *   1. Link health   — fetches each unique URL; classifies OK / permanently
 *                      moved / 4xx / 5xx / network error / soft-404.
 *   2. Anchor reach  — for every URL with a `#fragment`, after a successful
 *                      fetch, confirms the served HTML actually contains the
 *                      fragment's target (`id="frag"` / `name="frag"`). A
 *                      missing anchor means the link does not reach the cited
 *                      section. This catches the SPA-shell bug class: a page
 *                      returns HTTP 200 but is a client-side app shell (Angular
 *                      etc.) that never renders the article, so the `#anchor`
 *                      never resolves for a human. The shell lacks the anchor
 *                      for *every* client (IP-independent), so this is reliable
 *                      from datacenter runners. Mirrors the served-HTML signal
 *                      in scripts/audit-fetch-links.mjs.
 *                        - SPA_DOMAINS  → missing anchor is an ERROR (fedlex-
 *                          class regression; high confidence — see severity
 *                          note at probeUrl).
 *                        - other hosts → missing anchor is a WARNING (some
 *                          sites legitimately inject anchors via JS; avoid a
 *                          datacenter false-red).
 *   3. Staleness     — flags claims whose `reviewBy` is past (ERROR) or due
 *                      within 14 days (WARNING), and VERIFIED claims missing
 *                      `lastVerified`/`reviewBy` (ERROR).
 *   4. Content drift — compares a normalized text hash of each page against
 *                      the committed baseline (scripts/link-baseline.json) and
 *                      reports changes as WARNINGS (a drifted page may
 *                      invalidate a VERIFIED claim; only fact-verifier may
 *                      re-verify).
 *
 * Usage:
 *   node scripts/check-links.mjs [--report <path.md>] [--update-baseline] [--skip-network]
 *
 * Exit code 1 on any ERROR (dead link, unreachable anchor on an SPA domain,
 * past-due review, missing provenance); 0 otherwise (warnings do not fail
 * the run).
 *
 * Roles (CLAUDE.md): this script never edits content. Restoring VERIFIED
 * status after a FLAGGED/drift finding is fact-verifier's job.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Domains that block non-browser clients (e.g. eda.admin.ch returns 403 to
 * anything it fingerprints as a bot). Failures on these domains are reported
 * as WARNINGS ("manual check needed"), never hard failures.
 *
 * france-visas.gouv.fr: returns HTTP 403 to Node's fetch client (UA/TLS
 * fingerprint) but HTTP 200 to browsers and curl; the pages render fine for
 * users (confirmed in the 2026-06-13 link audit). Same class as eda.admin.ch —
 * a manual-check warning, not a dead link.
 */
const MANUAL_CHECK_DOMAINS = ['www.eda.admin.ch', 'eda.admin.ch', 'france-visas.gouv.fr', 'www.france-visas.gouv.fr'];

/**
 * Domains that serve an error shell (or block) requests from datacenter IPs
 * (GitHub-hosted runners) while serving real content to normal traffic.
 * Evidence 2026-06-12: every www.ch.ch URL returned HTTP 200 with an
 * "Error Page (404)" h1 from a GitHub runner, while the same URLs returned
 * full content — and passed independent fact-verification — from a local
 * machine within the same hour.
 *
 * IN CI ONLY these are downgraded to manual-check warnings and excluded from
 * drift comparison (CI literally cannot see the real page). Local runs
 * (`npm run links`) audit them fully — that is the true coverage for these
 * domains; CI red would be permanent false alarm.
 */
const DATACENTER_BLOCKED_DOMAINS = ['www.ch.ch', 'ch.ch'];
// (CI detection: IS_CI is declared once, further down, as GITHUB_ACTIONS === 'true'.)

/**
 * Single-page-app domains whose HTML shell carries no readable content
 * (e.g. fedlex.admin.ch renders everything client-side). For these we trust
 * the HTTP status, skip the soft-404 "near-empty body" heuristic, and note
 * that drift detection only covers the shell.
 *
 * IMPORTANT (2026-06-13): trusting HTTP 200 alone is exactly what let 23
 * broken Swiss Fedlex links slip through — `/eli/cc/.../en#art_X` served an
 * Angular shell ("this version is under preparation") that returns 200 but
 * never renders the cited article, so the `#art_X` anchor never resolves for a
 * human. The anchor-reach check (see probeUrl) closes that hole: for an SPA
 * domain a *successfully fetched* page that lacks the requested `#fragment`
 * anchor is a hard ERROR. The shell omits the anchor for every client, so
 * this verdict is IP-independent and reliable from GitHub's datacenter runners.
 * The fix was to cite the static consolidated HTML on the fedlex.data.admin.ch
 * filestore (still on this host) which DOES carry `id="art_X"`.
 */
const SPA_DOMAINS = ['www.fedlex.admin.ch', 'fedlex.admin.ch'];

const PER_DOMAIN_DELAY_MS = 1000; // politeness delay between requests to the same host
const FETCH_TIMEOUT_MS = 20000;
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 1_000_000;
const REVIEW_WARN_WINDOW_DAYS = 14;
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const SOFT_404_PATTERNS = [
  /\b404\b/i,
  /page (was )?not found/i,
  /seite nicht gefunden/i,
  /page introuvable/i,
  /pagina non trovata/i,
  /no longer available/i,
  /(page|document) does not exist/i,
];
const NEAR_EMPTY_TEXT_CHARS = 100;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
// CORRIDORS_DIR override is for testing the script itself (point it at fixtures).
const CORRIDORS_DIR = process.env.CORRIDORS_DIR
  ? path.resolve(process.env.CORRIDORS_DIR)
  : path.join(REPO_ROOT, 'src', 'content', 'corridors');
const BASELINE_PATH = path.join(__dirname, 'link-baseline.json');

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const UPDATE_BASELINE = args.includes('--update-baseline');
const SKIP_NETWORK = args.includes('--skip-network'); // staleness-only run
const reportIdx = args.indexOf('--report');
const REPORT_PATH = reportIdx !== -1 ? args[reportIdx + 1] : null;
const IS_CI = process.env.GITHUB_ACTIONS === 'true';

// ---------------------------------------------------------------------------
// 1. Collect claims from the content collection
// ---------------------------------------------------------------------------

/** @typedef {{file:string, taskId:string, field:string, url:string,
 *             sourceName:string, status:string, lastVerified?:string,
 *             reviewBy?:string, text:string}} ClaimRef */

function collectClaims() {
  /** @type {ClaimRef[]} */
  const claims = [];
  const files = readdirSync(CORRIDORS_DIR).filter((f) => /\.ya?ml$/i.test(f));
  for (const file of files) {
    const full = path.join(CORRIDORS_DIR, file);
    const relRaw = path.relative(REPO_ROOT, full);
    const rel = relRaw.startsWith('..') ? full : relRaw.split(path.sep).join('/');
    const doc = parse(readFileSync(full, 'utf8'));
    if (!doc || !Array.isArray(doc.tasks)) continue;
    for (const task of doc.tasks) {
      const push = (field, claim) => {
        if (!claim || !claim.sourceUrl) return;
        claims.push({
          file: rel,
          taskId: task.id ?? '(no id)',
          field,
          url: claim.sourceUrl,
          sourceName: claim.sourceName ?? '',
          status: claim.status ?? 'UNVERIFIED',
          lastVerified: claim.lastVerified,
          reviewBy: claim.reviewBy,
          text: String(claim.text ?? '').slice(0, 120),
        });
      };
      push('summary', task.summary);
      push('timeline', task.timeline);
      push('cost', task.cost);
      (task.steps ?? []).forEach((step, si) =>
        (step.links ?? []).forEach((link, li) => push(`steps[${si}].links[${li}]`, link)),
      );
    }
  }
  return claims;
}

// ---------------------------------------------------------------------------
// 2. Staleness checks
// ---------------------------------------------------------------------------

function checkStaleness(claims, today) {
  const errors = [];
  const warnings = [];
  const msPerDay = 86_400_000;
  for (const c of claims) {
    const where = `${c.file} › task "${c.taskId}" › ${c.field}`;
    if (c.status === 'VERIFIED' && (!c.lastVerified || !c.reviewBy)) {
      errors.push({
        kind: 'provenance',
        claim: c,
        message: `VERIFIED claim missing ${!c.lastVerified ? 'lastVerified' : 'reviewBy'} — ${where}`,
      });
    }
    if (c.status === 'FLAGGED' || c.status === 'STALE') {
      errors.push({
        kind: 'status',
        claim: c,
        message: `claim is ${c.status} (build gate will fail) — ${where}`,
      });
    }
    if (c.status === 'UNVERIFIED') {
      warnings.push({
        kind: 'status',
        claim: c,
        message: `claim is UNVERIFIED (must pass fact-verifier before publish) — ${where}`,
      });
    }
    if (c.reviewBy) {
      const due = new Date(`${c.reviewBy}T00:00:00Z`);
      const days = Math.floor((due - today) / msPerDay);
      if (days < 0) {
        errors.push({
          kind: 'stale',
          claim: c,
          message: `review past due (reviewBy ${c.reviewBy}, ${-days}d overdue) — ${where}`,
        });
      } else if (days <= REVIEW_WARN_WINDOW_DAYS) {
        warnings.push({
          kind: 'stale-soon',
          claim: c,
          message: `review due in ${days}d (reviewBy ${c.reviewBy}) — ${where}`,
        });
      }
    }
  }
  return { errors, warnings };
}

// ---------------------------------------------------------------------------
// 3. Link health
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function htmlToText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&#\d+;|&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalization for the drift hash. On top of htmlToText, embedded URLs are
 * masked: admin.ch pages emit per-request internal hostnames in their
 * "Social share" footer (e.g. www.sem.admin.ch vs www.rhf.admin.ch), which
 * would otherwise produce false drift on every run.
 */
function driftText(text) {
  return text.replace(/https?:\/\/\S+/g, '<url>');
}

function extractTag(html, tag) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? htmlToText(m[1]) : '';
}

/**
 * Does the served HTML actually contain the target for `#fragment`?
 * Mirrors scripts/audit-fetch-links.mjs: an anchor target is `id="frag"` /
 * `name="frag"` (single or double quotes) or an in-page link `href="#frag"`.
 * `frag` is matched literally — fragments here are simple slugs (e.g. art_42,
 * art_1_a) with no regex metacharacters, so a substring scan is both correct
 * and robust to the markup variations across admin.ch pages.
 */
function anchorPresent(html, frag) {
  const a = frag.replace(/"/g, '');
  return (
    html.includes(`id="${a}"`) ||
    html.includes(`name="${a}"`) ||
    html.includes(`id='${a}'`) ||
    html.includes(`name='${a}'`) ||
    html.includes(`#${a}"`)
  );
}

const FETCH_RETRIES = 2; // retry transient connection failures before giving up
const RETRY_BACKOFF_MS = 1500;

/** fetchOnce with retries for transient network errors (HTTP responses are not retried). */
async function fetchWithRetry(url) {
  let lastErr;
  for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
    try {
      return await fetchOnce(url);
    } catch (err) {
      lastErr = err;
      if (attempt < FETCH_RETRIES) {
        await new Promise((r) => setTimeout(r, RETRY_BACKOFF_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

async function fetchOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,de;q=0.7',
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Probe one URL. Follows redirects manually so permanent moves are visible.
 *
 * Anchor-reach severity (the new SPA-shell check):
 *   - When a 2xx page does NOT contain the URL's `#fragment` target:
 *       · SPA_DOMAINS  → ERROR. The shell omits every article anchor for every
 *         client, so a miss here is a genuine "link does not reach the cited
 *         section" — IP-independent and safe to fail in CI. This is the exact
 *         fedlex regression we want to catch (re-introducing `/eli/.../en#art_X`).
 *       · other hosts  → WARNING. Some sites legitimately build in-page anchors
 *         in client-side JS, so a server-HTML miss could be a datacenter false
 *         positive; keep it visible without a false red. (Local `npm run links`
 *         from a residential IP still surfaces it as a warning too.)
 *   - manual-check / datacenter-blocked downgrades are decided BEFORE the body
 *     is read (they short-circuit above), so an anchor miss can never override
 *     those WARNING downgrades.
 *
 * @returns {Promise<{url:string, verdict:string, level:'ok'|'warn'|'error',
 *                    detail:string, httpStatus?:number, finalUrl?:string,
 *                    movedTo?:string|null, textHash?:string, title?:string,
 *                    anchor?:string|null, anchorOk?:boolean|null}>}
 */
async function probeUrl(url) {
  const host = new URL(url).hostname;
  // The fragment we must be able to reach (decoded slug, no leading '#').
  const frag = (() => {
    const h = new URL(url).hash;
    if (!h || h === '#') return null;
    try { return decodeURIComponent(h.slice(1)); } catch { return h.slice(1); }
  })();
  const manualCheck =
    MANUAL_CHECK_DOMAINS.includes(host) ||
    (IS_CI && DATACENTER_BLOCKED_DOMAINS.includes(host));
  const isSpa = SPA_DOMAINS.includes(host);
  const downgrade = (verdict, detail) =>
    manualCheck
      ? { url, verdict: 'manual-check', level: 'warn', detail: `${verdict}: ${detail} — domain is on the manual-check allowlist (blocks non-browser clients); verify in a real browser` }
      : null;

  let current = url;
  let movedTo = null;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const res = await fetchWithRetry(current);
      if ([301, 302, 303, 307, 308].includes(res.status)) {
        const loc = res.headers.get('location');
        if (!loc) {
          return downgrade('redirect', `HTTP ${res.status} without Location`) ?? {
            url, verdict: 'broken-redirect', level: 'error',
            detail: `HTTP ${res.status} with no Location header`, httpStatus: res.status,
          };
        }
        const next = new URL(loc, current).href;
        if (res.status === 301 || res.status === 308) movedTo = next;
        current = next;
        continue;
      }

      const httpStatus = res.status;
      if (httpStatus >= 400) {
        const cls = httpStatus >= 500 ? '5xx' : '4xx';
        return downgrade(cls, `HTTP ${httpStatus}`) ?? {
          url, verdict: `http-${cls}`, level: 'error',
          detail: `HTTP ${httpStatus} at ${current}`, httpStatus, finalUrl: current, movedTo,
        };
      }

      // 2xx — read body for soft-404 + anchor reach + drift hash.
      const fullBody = await res.text();
      const truncated = fullBody.length > MAX_BODY_BYTES;
      const raw = fullBody.slice(0, MAX_BODY_BYTES);
      const title = extractTag(raw, 'title');
      const h1 = extractTag(raw, 'h1');
      const text = htmlToText(raw);
      const textHash = createHash('sha256').update(driftText(text)).digest('hex');

      const markerHit = SOFT_404_PATTERNS.find((p) => p.test(title) || p.test(h1));
      if (markerHit) {
        return downgrade('soft-404', `marker ${markerHit} in title/h1`) ?? {
          url, verdict: 'soft-404', level: 'error',
          detail: `HTTP ${httpStatus} but title/h1 looks like an error page (title: "${title.slice(0, 80)}", h1: "${h1.slice(0, 80)}")`,
          httpStatus, finalUrl: current, movedTo, textHash, title,
        };
      }
      if (text.length < NEAR_EMPTY_TEXT_CHARS && !isSpa) {
        return downgrade('soft-404', 'near-empty body') ?? {
          url, verdict: 'soft-404', level: 'error',
          detail: `HTTP ${httpStatus} but body has almost no text (${text.length} chars) — likely an empty or placeholder page`,
          httpStatus, finalUrl: current, movedTo, textHash, title,
        };
      }

      // -- Anchor reach: does the served HTML actually contain the #fragment?
      // This is the SPA-shell guard. We evaluate it on a genuinely-fetched,
      // non-error 2xx page (we are past redirects, 4xx/5xx and soft-404 above).
      const anchorOk = frag ? anchorPresent(raw, frag) : null;
      if (frag && anchorOk === false) {
        // A page bigger than our read cap whose anchor would sit past the cap
        // could false-miss — only on a NON-shell page (the fedlex shell is tiny
        // and carries no anchors at all). Downgrade that narrow case to a warn.
        const looksLikeShell = /app-root|ng-version|__NUXT__|__NEXT_DATA__/i.test(raw);
        if (truncated && !looksLikeShell) {
          return {
            url, verdict: 'anchor-unverifiable', level: 'warn',
            detail: `HTTP ${httpStatus} but page exceeds ${MAX_BODY_BYTES}-byte read cap and "#${frag}" was not seen in the read portion — verify the anchor manually`,
            httpStatus, finalUrl: current, movedTo, textHash, title, anchor: frag, anchorOk: false,
          };
        }
        // SPA domains: a missing anchor is a hard, IP-independent broken link
        // (the shell never renders the article). Non-SPA: warn (anchor may be
        // injected by client JS — avoid a datacenter false-red).
        const level = isSpa ? 'error' : 'warn';
        const where = isSpa
          ? 'served page is a client-side app shell that never renders the cited section (the link does not reach the cited section)'
          : 'anchor not found in server HTML (may be injected by client-side JS — verify in a real browser)';
        return {
          url, verdict: 'anchor-missing', level,
          detail: `HTTP ${httpStatus} but "#${frag}" is absent from the served HTML — ${where}`,
          httpStatus, finalUrl: current, movedTo, textHash, title, anchor: frag, anchorOk: false,
        };
      }

      if (movedTo) {
        return {
          url, verdict: 'moved-permanently', level: 'warn',
          detail: `source moved: now at ${current} — update sourceUrl and have fact-verifier re-confirm`,
          httpStatus, finalUrl: current, movedTo, textHash, title, anchor: frag, anchorOk,
        };
      }
      return {
        url, verdict: isSpa ? 'ok-spa-shell' : 'ok', level: 'ok',
        detail:
          (isSpa
            ? `HTTP ${httpStatus} (JS-rendered page: status check only; drift covers the HTML shell)`
            : `HTTP ${httpStatus}`) +
          (frag ? ` — anchor "#${frag}" present` : ''),
        httpStatus, finalUrl: current, movedTo: null, textHash, title, anchor: frag, anchorOk,
      };
    }
    return downgrade('redirect-loop', `more than ${MAX_REDIRECTS} redirects`) ?? {
      url, verdict: 'redirect-loop', level: 'error',
      detail: `more than ${MAX_REDIRECTS} redirects`, movedTo,
    };
  } catch (err) {
    const reason = err.name === 'AbortError' ? `timeout after ${FETCH_TIMEOUT_MS}ms` : (err.cause?.code ?? err.message);
    // Per-domain manual-check downgrade first (eda.admin.ch always; ch.ch in CI).
    const domainWarn = downgrade('network-error', reason);
    if (domainWarn) return domainWarn;
    // A connection-level failure (timeout / DNS / refused) AFTER retries means
    // the host could not be reached at all. In CI this reflects the runner's
    // datacenter egress — Swiss federal sites (*.admin.ch) time out connections
    // from datacenter IPs — NOT a dead link. HTTP 4xx/5xx/soft-404 above stay
    // hard errors everywhere; only connection-level failures are downgraded, and
    // only in CI. Local runs (residential IP) stay authoritative and fail hard
    // so a genuine outage still surfaces.
    if (IS_CI) {
      return {
        url, verdict: 'unreachable-from-ci', level: 'warn',
        detail: `${reason} — host unreachable from CI datacenter egress (not a dead link). Authoritative check: run \`npm run links\` locally.`,
      };
    }
    return { url, verdict: 'network-error', level: 'error', detail: String(reason) };
  }
}

/** Fetch all unique URLs, sequential per host with a politeness delay. */
async function probeAll(urls) {
  const byHost = new Map();
  for (const u of urls) {
    const host = new URL(u).hostname;
    if (!byHost.has(host)) byHost.set(host, []);
    byHost.get(host).push(u);
  }
  const results = new Map();
  await Promise.all(
    [...byHost.values()].map(async (queue) => {
      for (let i = 0; i < queue.length; i++) {
        if (i > 0) await sleep(PER_DOMAIN_DELAY_MS);
        results.set(queue[i], await probeUrl(queue[i]));
      }
    }),
  );
  return results;
}

// ---------------------------------------------------------------------------
// 4. Content drift (baseline of normalized text hashes)
// ---------------------------------------------------------------------------

function loadBaseline() {
  if (!existsSync(BASELINE_PATH)) return { generatedAt: null, urls: {} };
  try {
    return JSON.parse(readFileSync(BASELINE_PATH, 'utf8'));
  } catch {
    return { generatedAt: null, urls: {} };
  }
}

function checkDrift(probeResults, baseline, today) {
  const warnings = [];
  const notes = [];
  const nextUrls = { ...baseline.urls };
  for (const [url, r] of probeResults) {
    if (!r.textHash) continue; // only hash pages we actually read
    if (IS_CI && DATACENTER_BLOCKED_DOMAINS.includes(new URL(url).hostname)) {
      continue; // CI sees a blocked/error variant, not the real page — local runs own drift here
    }
    const base = baseline.urls[url];
    if (!base) {
      notes.push(`no baseline entry yet for ${url} (run \`npm run links -- --update-baseline\` and commit scripts/link-baseline.json)`);
    } else if (base.sha256 !== r.textHash) {
      warnings.push({
        kind: 'drift',
        message: `content drift: ${url} changed since baseline ${base.capturedAt} — page text differs; VERIFIED claims citing it may be invalidated (fact-verifier must re-check)`,
      });
    }
    if (UPDATE_BASELINE && r.level !== 'error') {
      nextUrls[url] = { sha256: r.textHash, capturedAt: today.toISOString().slice(0, 10), httpStatus: r.httpStatus };
    }
  }
  if (UPDATE_BASELINE) {
    writeFileSync(
      BASELINE_PATH,
      JSON.stringify({ generatedAt: today.toISOString(), urls: nextUrls }, null, 2) + '\n',
    );
  }
  return { warnings, notes };
}

// ---------------------------------------------------------------------------
// 5. Report + main
// ---------------------------------------------------------------------------

function annotate(level, file, message) {
  if (!IS_CI) return;
  const safe = message.replace(/\r?\n/g, ' ');
  console.log(`::${level} file=${file ?? 'scripts/check-links.mjs'}::${safe}`);
}

async function main() {
  const today = new Date();
  const claims = collectClaims();
  const uniqueUrls = [...new Set(claims.map((c) => c.url))];
  const urlClaims = new Map(); // url -> ClaimRef[]
  for (const c of claims) {
    if (!urlClaims.has(c.url)) urlClaims.set(c.url, []);
    urlClaims.get(c.url).push(c);
  }

  console.log(`link-auditor: ${claims.length} claims, ${uniqueUrls.length} unique URLs across ${new Set(claims.map((c) => c.file)).size} corridor file(s)\n`);

  // -- staleness
  const stale = checkStaleness(claims, today);

  // -- link health + drift
  let probeResults = new Map();
  let drift = { warnings: [], notes: [] };
  if (!SKIP_NETWORK) {
    probeResults = await probeAll(uniqueUrls);
    drift = checkDrift(probeResults, loadBaseline(), today);
  }

  const linkErrors = [];
  const linkWarnings = [];
  const linkOk = [];
  const anchorFindings = []; // unreachable-anchor results (error+warn), for a dedicated breakout
  for (const [url, r] of probeResults) {
    const affected = urlClaims.get(url) ?? [];
    const locs = affected.map((c) => `${c.taskId}/${c.field}`).join(', ');
    const line = `[${r.verdict}] ${url} — ${r.detail} (claims: ${locs})`;
    if (r.level === 'error') linkErrors.push({ url, line, affected });
    else if (r.level === 'warn') linkWarnings.push({ url, line, affected });
    else linkOk.push({ url, line });
    if (r.anchorOk === false) {
      anchorFindings.push({ url, line, level: r.level, affected });
    }
  }

  // -- console + annotations
  const section = (t) => console.log(`\n## ${t}`);
  if (linkErrors.length) {
    section('LINK FAILURES (hard errors)');
    for (const e of linkErrors) {
      console.log(`  ERROR ${e.line}`);
      annotate('error', e.affected[0]?.file, e.line);
    }
  }
  if (stale.errors.length) {
    section('STALENESS / PROVENANCE ERRORS');
    for (const e of stale.errors) {
      console.log(`  ERROR ${e.message}`);
      annotate('error', e.claim.file, e.message);
    }
  }
  if (linkWarnings.length || drift.warnings.length || stale.warnings.length) {
    section('WARNINGS');
    for (const w of linkWarnings) {
      console.log(`  WARN ${w.line}`);
      annotate('warning', w.affected[0]?.file, w.line);
    }
    for (const w of drift.warnings) {
      console.log(`  WARN ${w.message}`);
      annotate('warning', null, w.message);
    }
    for (const w of stale.warnings) {
      console.log(`  WARN ${w.message}`);
      annotate('warning', w.claim.file, w.message);
    }
  }
  if (anchorFindings.length) {
    section(`ANCHOR REACH (${anchorFindings.length} link(s) do not reach their cited #section)`);
    for (const a of anchorFindings) {
      console.log(`  ${a.level === 'error' ? 'ERROR' : 'WARN'} ${a.line}`);
    }
  }
  if (drift.notes.length) {
    section('NOTES');
    for (const n of drift.notes) console.log(`  NOTE ${n}`);
  }
  if (linkOk.length) {
    section(`OK (${linkOk.length} URLs)`);
    for (const o of linkOk) console.log(`  OK ${o.line}`);
  }

  const errorCount = linkErrors.length + stale.errors.length;
  const warnCount = linkWarnings.length + drift.warnings.length + stale.warnings.length;
  const anchorMisses = anchorFindings.length
    ? `, ${anchorFindings.length} unreachable anchor(s)`
    : '';
  console.log(`\n== link-auditor summary: ${errorCount} error(s), ${warnCount} warning(s)${anchorMisses}, ${linkOk.length}/${uniqueUrls.length} URLs OK ==`);

  // -- markdown report (CI artifact / tracking issue body)
  if (REPORT_PATH) {
    const md = [];
    md.push(`# Link audit report`);
    md.push(``);
    md.push(`- Date: ${today.toISOString()}`);
    md.push(`- Claims: ${claims.length} · Unique URLs: ${uniqueUrls.length}`);
    md.push(`- Result: **${errorCount} error(s), ${warnCount} warning(s)**`);
    md.push(``);
    if (anchorFindings.length) {
      // Dedicated breakout for the SPA-shell bug class — these links return
      // HTTP 200 but their #section never resolves for a human. (Lines also
      // appear in the failures/warnings sections below by severity.)
      md.push(`## Unreachable anchors (link does not reach the cited #section)`);
      for (const a of anchorFindings) {
        md.push(`- ${a.level === 'error' ? '**[ERROR]**' : '[warn]'} ${a.line}`);
      }
      md.push(``);
    }
    if (linkErrors.length) {
      md.push(`## Link failures (hard errors)`);
      for (const e of linkErrors) md.push(`- ${e.line}`);
      md.push(``);
    }
    if (stale.errors.length) {
      md.push(`## Staleness / provenance errors`);
      for (const e of stale.errors) md.push(`- ${e.message}`);
      md.push(``);
    }
    if (linkWarnings.length || drift.warnings.length || stale.warnings.length) {
      md.push(`## Warnings`);
      for (const w of linkWarnings) md.push(`- ${w.line}`);
      for (const w of drift.warnings) md.push(`- ${w.message}`);
      for (const w of stale.warnings) md.push(`- ${w.message}`);
      md.push(``);
    }
    if (drift.notes.length) {
      md.push(`## Notes`);
      for (const n of drift.notes) md.push(`- ${n}`);
      md.push(``);
    }
    md.push(`## Healthy URLs (${linkOk.length})`);
    for (const o of linkOk) md.push(`- ${o.line}`);
    md.push(``);
    md.push(`---`);
    md.push(`*Generated by \`scripts/check-links.mjs\` (link-auditor). Drift/FLAGGED findings must be re-verified by fact-verifier before status can return to VERIFIED.*`);
    writeFileSync(path.resolve(REPORT_PATH), md.join('\n'));
    console.log(`report written to ${path.resolve(REPORT_PATH)}`);
  }

  process.exitCode = errorCount > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('link-auditor crashed:', err);
  process.exitCode = 2;
});
