#!/usr/bin/env node
/**
 * snapshot-source.mjs — capture an official source into the snapshot cache (ADR-0017).
 *
 * Fetches a public official-source URL via LOCAL curl (residential IP — dodges
 * the datacenter-IP block on *.admin.ch / ch.ch that defeats agent WebFetch),
 * normalizes it to stable text, hashes it, and writes:
 *   - raw bytes, gzipped, to  sources/.cache/<sha256>.html.gz   (GITIGNORED — regenerable)
 *   - normalized text to       sources/<corridor>/<first8-of-sha>.txt   (TRACKED)
 *   - an index entry in        sources/<corridor>/manifest.json         (TRACKED)
 *
 * The manifest is the dated audit trail ("what the source said on day X") and
 * the drift baseline (scripts/check-sources.mjs re-fetches and compares sha256).
 *
 * Usage:
 *   node scripts/snapshot-source.mjs <url> <corridor> [--name "Authority"] [--claim <taskId>]
 *
 * Dedup: keyed by sha256 of the normalized text. Re-snapshotting identical
 * content updates `fetchedAt` and merges any new claimId; nothing is duplicated.
 *
 * On fetch failure: prints a clear error, writes NOTHING, exits non-zero — so a
 * caller (researcher) keeps the claim UNVERIFIED rather than citing a snapshot
 * that doesn't exist.
 *
 * Roles (CLAUDE.md / ADR-0017): a snapshot is an audit trail and a drift signal,
 * NEVER a substitute for the verifier's live re-fetch. Capturing here does not
 * verify anything.
 */

import { spawnSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeSource } from './lib/normalize-source.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCES_DIR = path.join(REPO_ROOT, 'sources');
const CACHE_DIR = path.join(SOURCES_DIR, '.cache');

const CURL_TIMEOUT_S = 30;
const CAPTURED_BY = 'snapshot-source';

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const positional = [];
  let name = '';
  let claim = '';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--name') {
      name = argv[++i] ?? '';
    } else if (a === '--claim') {
      claim = argv[++i] ?? '';
    } else if (a.startsWith('--name=')) {
      name = a.slice('--name='.length);
    } else if (a.startsWith('--claim=')) {
      claim = a.slice('--claim='.length);
    } else {
      positional.push(a);
    }
  }
  return { url: positional[0], corridor: positional[1], name, claim };
}

function usage(msg) {
  if (msg) console.error(`error: ${msg}\n`);
  console.error(
    'usage: node scripts/snapshot-source.mjs <url> <corridor> [--name "Authority"] [--claim <taskId>]',
  );
}

// ---------------------------------------------------------------------------
// Fetch (local curl) — returns raw body string + contentType, or throws.
// ---------------------------------------------------------------------------

/**
 * Fetch raw body via local curl. `-sL` = silent + follow redirects; `--max-time`
 * caps total time. We also ask for the final Content-Type via `-w` written to
 * stderr so it never contaminates the body on stdout.
 */
function curlFetch(url) {
  const res = spawnSync(
    'curl',
    [
      '-sL',
      '--max-time',
      String(CURL_TIMEOUT_S),
      '-w',
      '%{http_code} %{content_type}',
      url,
    ],
    { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 },
  );

  if (res.error) {
    throw new Error(`curl could not run: ${res.error.message}`);
  }
  if (res.status !== 0) {
    const stderr = res.stderr ? res.stderr.toString('utf8').trim() : '';
    throw new Error(
      `curl exited ${res.status}${stderr ? ` — ${stderr}` : ''} (URL unreachable: ${url})`,
    );
  }

  // `-w` output is appended to stdout AFTER the body. Split it off the tail.
  const stdout = res.stdout ?? Buffer.alloc(0);
  const wInfo = (res.stderr ? res.stderr.toString('utf8') : '').trim();
  // We sent -w to default (stdout); recover it from the tail of stdout instead.
  const full = stdout.toString('utf8');
  // Find the last occurrence of a trailing "<code> <type>" line.
  const m = full.match(/(\d{3})\s+([^\s]*)\s*$/);
  let httpCode = 0;
  let contentType = '';
  let body = full;
  if (m) {
    httpCode = Number(m[1]);
    contentType = m[2] || '';
    body = full.slice(0, m.index);
  }

  if (!httpCode || httpCode >= 400) {
    throw new Error(`HTTP ${httpCode || '???'} fetching ${url} — not captured`);
  }
  if (!body.trim()) {
    throw new Error(`empty body from ${url} — not captured`);
  }

  // rawBytes for the gz cache = the body bytes only (exclude the -w tail).
  const rawBytes = Buffer.from(body, 'utf8');
  return { body, rawBytes, contentType, httpCode };
}

// ---------------------------------------------------------------------------
// Manifest upsert
// ---------------------------------------------------------------------------

function loadManifest(manifestPath) {
  if (!existsSync(manifestPath)) return [];
  try {
    const parsed = JSON.parse(readFileSync(manifestPath, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    console.warn(`warning: ${manifestPath} was not valid JSON; starting a fresh manifest`);
    return [];
  }
}

function todayISO() {
  // Date here is metadata only (fetchedAt) — it is NOT part of the hashed text,
  // so determinism of the hash is unaffected.
  return new Date().toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { url, corridor, name, claim } = parseArgs(process.argv.slice(2));

  if (!url || !corridor) {
    usage('both <url> and <corridor> are required');
    process.exitCode = 2;
    return;
  }
  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    usage(`"${url}" is not a valid URL`);
    process.exitCode = 2;
    return;
  }

  let fetched;
  try {
    fetched = curlFetch(url);
  } catch (err) {
    console.error(`error: ${err.message}`);
    process.exitCode = 1;
    return;
  }

  const { rawBytes, contentType } = fetched;
  const { text, sha256 } = normalizeSource(fetched.body, contentType);
  const shaPrefix = sha256.slice(0, 8);

  const corridorDir = path.join(SOURCES_DIR, corridor);
  const textPathAbs = path.join(corridorDir, `${shaPrefix}.txt`);
  const textPathRel = `sources/${corridor}/${shaPrefix}.txt`;
  const manifestPath = path.join(corridorDir, 'manifest.json');
  const cachePathAbs = path.join(CACHE_DIR, `${sha256}.html.gz`);

  // -- write raw → gzipped cache (gitignored, regenerable)
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(cachePathAbs, gzipSync(rawBytes));

  // -- write normalized text (tracked)
  mkdirSync(corridorDir, { recursive: true });
  writeFileSync(textPathAbs, text + '\n');

  // -- upsert manifest entry (dedup by sha256; merge claimIds)
  const manifest = loadManifest(manifestPath);
  const claimIds = claim ? [claim] : [];
  const existing = manifest.find((e) => e && e.sha256 === sha256);

  let action;
  if (existing) {
    // Same content already captured — refresh metadata, merge any new claimId.
    existing.sourceUrl = url;
    if (name) existing.sourceName = name;
    existing.fetchedAt = todayISO();
    existing.byteSize = rawBytes.length;
    existing.contentType = contentType;
    existing.textPath = textPathRel;
    existing.capturedBy = CAPTURED_BY;
    existing.fetchMethod = 'curl';
    for (const id of claimIds) {
      if (!existing.claimIds.includes(id)) existing.claimIds.push(id);
    }
    action = 'updated';
  } else {
    manifest.push({
      sourceUrl: url,
      sourceName: name,
      claimIds,
      fetchedAt: todayISO(),
      fetchMethod: 'curl',
      sha256,
      byteSize: rawBytes.length,
      contentType,
      textPath: textPathRel,
      capturedBy: CAPTURED_BY,
    });
    action = 'added';
  }

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');

  console.log(`snapshot ${action}: ${url}`);
  console.log(`  corridor   : ${corridor}`);
  console.log(`  sha256     : ${sha256}`);
  console.log(`  bytes      : ${rawBytes.length} (${contentType || 'unknown content-type'})`);
  console.log(`  text       : ${textPathRel}`);
  console.log(`  raw cache  : sources/.cache/${sha256}.html.gz (gitignored)`);
  console.log(`  manifest   : sources/${corridor}/manifest.json`);
  if (claimIds.length) console.log(`  claimIds   : ${claimIds.join(', ')}`);
}

main();
