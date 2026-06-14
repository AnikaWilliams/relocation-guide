// Phase 1a of the link audit: fetch what a USER gets for each unique URL (via
// local curl = residential IP, so gov sites that block datacenter IPs respond),
// and compute deterministic render-health signals. Judgment (relevance, "is this
// a JS shell really") is done by the audit workflow on top of these signals.
//
// Run: node scripts/audit-fetch-links.mjs
// Reads:  link-audit/unique-urls.json
// Writes: link-audit/fetch-results.json  + raw HTML in link-audit/.cache/ (gitignored)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const SENT = '__AUDIT_META_7e3f__';

mkdirSync('link-audit/.cache', { recursive: true });
const urls = JSON.parse(readFileSync('link-audit/unique-urls.json', 'utf8'));

function visibleText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const results = [];
let i = 0;
for (const u of urls) {
  i++;
  const rec = { url: u.url, host: u.host, anchor: u.anchor, count: u.count };
  try {
    const out = execFileSync(
      'curl',
      ['-sL', '--max-time', '30', '-A', UA, '-w', `\n${SENT}%{http_code}\t%{url_effective}\t%{content_type}`, u.url],
      { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
    );
    const idx = out.lastIndexOf(SENT);
    const body = idx >= 0 ? out.slice(0, idx) : out;
    const meta = idx >= 0 ? out.slice(idx + SENT.length) : '';
    const [code, finalUrl, ctype] = meta.split('\t');
    const text = visibleText(body);
    const sha = createHash('sha256').update(u.url).digest('hex').slice(0, 12);
    writeFileSync(`link-audit/.cache/${sha}.html`, body);

    rec.httpCode = Number(code) || 0;
    rec.finalUrl = (finalUrl || '').trim();
    rec.redirected = rec.finalUrl && rec.finalUrl.replace(/#.*/, '') !== u.url.replace(/#.*/, '');
    rec.contentType = (ctype || '').trim();
    rec.bytes = body.length;
    rec.visibleTextLen = text.length;
    rec.textSample = text.slice(0, 400);
    rec.cacheFile = `link-audit/.cache/${sha}.html`;
    // anchor present in served HTML?
    if (u.anchor) {
      const a = u.anchor.replace(/"/g, '');
      rec.anchorPresent =
        body.includes(`id="${a}"`) || body.includes(`name="${a}"`) || body.includes(`#${a}"`) || body.includes(`id='${a}'`);
    } else {
      rec.anchorPresent = null;
    }
    // JS-shell heuristic
    const shellMarkers = /app-root|ng-version|__NUXT__|__NEXT_DATA__|id="root"|please enable javascript|enable javascript to/i.test(body);
    rec.jsShellLikely = shellMarkers && rec.visibleTextLen < 1500;
    rec.suspect = rec.httpCode !== 200 || rec.jsShellLikely || rec.anchorPresent === false || rec.visibleTextLen < 600;
  } catch (e) {
    rec.httpCode = 0;
    rec.error = String(e.message || e).slice(0, 200);
    rec.suspect = true;
  }
  results.push(rec);
  if (i % 20 === 0) process.stderr.write(`  fetched ${i}/${urls.length}\n`);
}

writeFileSync('link-audit/fetch-results.json', JSON.stringify(results, null, 2));
const suspect = results.filter((r) => r.suspect).length;
const shells = results.filter((r) => r.jsShellLikely).length;
const dead = results.filter((r) => r.httpCode !== 200).length;
const badAnchor = results.filter((r) => r.anchorPresent === false).length;
console.log(`fetched ${results.length} | suspect ${suspect} (js-shell ${shells}, non-200 ${dead}, missing-anchor ${badAnchor})`);
