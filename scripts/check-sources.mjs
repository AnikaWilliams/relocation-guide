#!/usr/bin/env node
/**
 * check-sources.mjs — content-drift detection over the snapshot cache (ADR-0017).
 *
 * For every entry in every sources/<corridor>/manifest.json: re-fetch the
 * sourceUrl LIVE (shared fetchSource — same fetch path as capture), normalize,
 * hash, and compare to the stored sha256. Reports per-URL status and a summary:
 *   OK          — live content normalizes to the same hash as the snapshot
 *   DRIFTED     — content changed since capture (VERIFIED claims citing it may
 *                 be invalidated; only fact-verifier may re-confirm)
 *   UNREACHABLE — could not fetch the source (network / HTTP error)
 *
 * Usage:
 *   node scripts/check-sources.mjs [--strict]
 *
 * Exit codes:
 *   default       — 0 always (drift/unreachable are warnings)
 *   --strict      — 1 if any DRIFTED or UNREACHABLE
 * If no manifests exist: prints "no sources tracked yet" and exits 0.
 *
 * Roles (CLAUDE.md): this script never edits content or status. A DRIFTED finding
 * is a signal for fact-verifier to re-check live, not an automatic status change.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSource } from './lib/normalize-source.mjs';
import { fetchSource } from './lib/source-fetch.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCES_DIR = path.join(REPO_ROOT, 'sources');

const STRICT = process.argv.slice(2).includes('--strict');
const IS_CI = process.env.GITHUB_ACTIONS === 'true';

// ---------------------------------------------------------------------------
// Discover manifests
// ---------------------------------------------------------------------------

/** Every sources/<corridor>/manifest.json (skips the .cache dir and non-dirs). */
function findManifests() {
  if (!existsSync(SOURCES_DIR)) return [];
  const manifests = [];
  for (const entry of readdirSync(SOURCES_DIR)) {
    if (entry.startsWith('.')) continue; // skip .cache and dotfiles
    const dir = path.join(SOURCES_DIR, entry);
    let isDir = false;
    try {
      isDir = statSync(dir).isDirectory();
    } catch {
      isDir = false;
    }
    if (!isDir) continue;
    const manifestPath = path.join(dir, 'manifest.json');
    if (existsSync(manifestPath)) manifests.push({ corridor: entry, manifestPath });
  }
  return manifests;
}

function loadEntries(manifestPath) {
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn(`warning: could not parse ${manifestPath}: ${err.message}`);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const manifests = findManifests();
  if (manifests.length === 0) {
    console.log('no sources tracked yet');
    process.exitCode = 0;
    return;
  }

  let ok = 0;
  let drifted = 0;
  let unreachable = 0;
  let total = 0;

  for (const { corridor, manifestPath } of manifests) {
    const entries = loadEntries(manifestPath);
    if (entries.length === 0) continue;
    console.log(`\n## ${corridor} (${entries.length} source${entries.length === 1 ? '' : 's'})`);

    for (const entry of entries) {
      total++;
      const url = entry.sourceUrl;
      const who = entry.sourceName ? ` [${entry.sourceName}]` : '';
      const claims = entry.claimIds?.length ? ` (claims: ${entry.claimIds.join(', ')})` : '';

      let fetched;
      try {
        fetched = fetchSource(url);
      } catch (err) {
        unreachable++;
        console.log(`  UNREACHABLE ${url}${who} — ${err.message}${claims}`);
        annotate('warning', `UNREACHABLE ${url} — ${err.message}`);
        continue;
      }

      const { sha256 } = normalizeSource(fetched.body, fetched.contentType || entry.contentType);
      if (sha256 === entry.sha256) {
        ok++;
        console.log(`  OK          ${url}${who}${claims}`);
      } else {
        drifted++;
        console.log(
          `  DRIFTED     ${url}${who} — content changed since ${entry.fetchedAt}` +
            ` (snapshot ${entry.sha256.slice(0, 12)}… now ${sha256.slice(0, 12)}…)` +
            ` — VERIFIED claims citing it must be re-checked by fact-verifier${claims}`,
        );
        annotate('warning', `DRIFTED ${url} — content changed since ${entry.fetchedAt}`);
      }
    }
  }

  console.log(
    `\n== check-sources summary: ${ok} OK, ${drifted} drifted, ${unreachable} unreachable` +
      ` (${total} tracked source${total === 1 ? '' : 's'}) ==`,
  );

  if (STRICT && (drifted > 0 || unreachable > 0)) {
    console.log('strict mode: failing because of drifted/unreachable sources.');
    process.exitCode = 1;
  } else {
    process.exitCode = 0;
  }
}

function annotate(level, message) {
  if (!IS_CI) return;
  console.log(`::${level} file=scripts/check-sources.mjs::${message.replace(/\r?\n/g, ' ')}`);
}

main();
