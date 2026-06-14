// Phase 4 of the link audit: apply the curl-verified replacements from
// link-audit/verdicts.json to the corridor YAMLs (exact full-URL string swap).
// Only applies replacements that are replacementVerified AND supportsPoint.
//
// Run: node scripts/audit-apply-fixes.mjs            (dry run — reports only)
//      node scripts/audit-apply-fixes.mjs --write    (apply)
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const write = process.argv.includes('--write');
const verdicts = JSON.parse(readFileSync('link-audit/verdicts.json', 'utf8'));

const map = new Map();
for (const v of verdicts) {
  if (v.status !== 'good' && v.replacement && v.replacementVerified && v.supportsPoint) {
    map.set(v.url, v.replacement);
  }
}
console.log(`${map.size} verified replacements to apply.`);

const dir = 'src/content/corridors/';
let grand = 0;
for (const f of readdirSync(dir).filter((x) => x.endsWith('.yaml'))) {
  let txt = readFileSync(dir + f, 'utf8');
  let fileCount = 0;
  for (const [oldUrl, newUrl] of map) {
    // Exact full-URL match (the anchor is part of the string, so #art_4 never
    // partially matches #art_42). Count then replace.
    const occurrences = txt.split(oldUrl).length - 1;
    if (occurrences > 0) {
      txt = txt.split(oldUrl).join(newUrl);
      fileCount += occurrences;
    }
  }
  if (fileCount > 0) {
    console.log(`  ${f}: ${fileCount} replacement(s)`);
    grand += fileCount;
    if (write) writeFileSync(dir + f, txt);
  }
}
console.log(`${write ? 'APPLIED' : 'DRY RUN'} — ${grand} total occurrence(s) across corridors.`);
if (!write) console.log('Re-run with --write to apply.');
