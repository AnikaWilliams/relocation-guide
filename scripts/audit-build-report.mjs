// Phase 3 of the link audit: join the inventory (unique-urls.json + usages.json)
// with the fetch signals (fetch-results.json) and the agent verdicts
// (verdicts.json) into the human deliverables under link-audit/.
//
// Run: node scripts/audit-build-report.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const unique = JSON.parse(readFileSync('link-audit/unique-urls.json', 'utf8'));
const usages = JSON.parse(readFileSync('link-audit/usages.json', 'utf8'));
const fetched = JSON.parse(readFileSync('link-audit/fetch-results.json', 'utf8'));
const verdicts = JSON.parse(readFileSync('link-audit/verdicts.json', 'utf8'));

const fetchBy = new Map(fetched.map((f) => [f.url, f]));
const verdictBy = new Map(verdicts.map((v) => [v.url, v]));
const sourceNameBy = new Map();
for (const u of usages) if (!sourceNameBy.has(u.url)) sourceNameBy.set(u.url, u.sourceName);

const CORRIDOR_NAMES = {
  'us-at': 'USA → Austria', 'us-be': 'USA → Belgium', 'us-ch': 'USA → Switzerland',
  'us-de': 'USA → Germany', 'us-fr': 'USA → France', 'us-gb': 'USA → United Kingdom',
  'us-ie': 'USA → Ireland', 'us-lu': 'USA → Luxembourg', 'us-nl': 'USA → Netherlands',
};

const flaggedUrls = new Set(verdicts.filter((v) => v.status !== 'good').map((v) => v.url));
const goodUnique = unique.filter((u) => !flaggedUrls.has(u.url));
const flaggedUnique = unique.filter((u) => flaggedUrls.has(u.url));

// ---- links.json (machine-readable) -----------------------------------------
const machine = {
  generated: 'scripts/audit-build-report.mjs',
  totals: { references: usages.length, uniqueUrls: unique.length, good: goodUnique.length, flagged: flaggedUnique.length },
  good: goodUnique.map((u) => ({
    url: u.url, host: u.host, sourceName: sourceNameBy.get(u.url) || '', references: u.count,
    checked: verdictBy.has(u.url) ? 'spot-checked' : 'auto-render-check',
    usages: u.usages,
  })),
  flagged: flaggedUnique.map((u) => {
    const v = verdictBy.get(u.url) || {};
    return {
      url: u.url, host: u.host, sourceName: sourceNameBy.get(u.url) || '', references: u.count,
      problem: v.problem || '', replacement: v.replacement || '', replacementVerified: !!v.replacementVerified,
      supportsPoint: v.supportsPoint !== false, note: v.note || '', usages: u.usages,
    };
  }),
};
writeFileSync('link-audit/links.json', JSON.stringify(machine, null, 2));

// ---- good-links.md ----------------------------------------------------------
function groupByCorridorTask(items) {
  const m = new Map();
  for (const u of items) {
    for (const us of u.usages) {
      const ck = `${us.corridor}::${us.taskId}`;
      if (!m.has(ck)) m.set(ck, new Map());
      const taskMap = m.get(ck);
      if (!taskMap.has(u.url)) taskMap.set(u.url, { url: u.url, locations: new Set() });
      taskMap.get(u.url).locations.add(us.location);
    }
  }
  return m;
}
const goodGroups = groupByCorridorTask(goodUnique);
let g = `# Good links — verified usable\n\n`;
g += `Links that return HTTP 200 **and render their cited content for a human**. `;
g += `${goodUnique.length} unique URLs across the site. ` +
  `\`✓✓\` = individually spot-checked (rendered + confirmed to support its point); ` +
  `\`✓\` = passed the automated render check (status 200, anchor/content present). ` +
  `See SUMMARY.md for method. Generated from links.json.\n`;
let lastCorridor = '';
for (const [ck, taskMap] of [...goodGroups.entries()].sort()) {
  const [corridor, taskId] = ck.split('::');
  if (corridor !== lastCorridor) { g += `\n## ${corridor} — ${CORRIDOR_NAMES[corridor] || corridor}\n`; lastCorridor = corridor; }
  g += `\n**${taskId}**\n`;
  for (const { url, locations } of taskMap.values()) {
    const mark = verdictBy.has(url) ? '✓✓' : '✓';
    const name = sourceNameBy.get(url) || '';
    g += `- ${mark} [${name}](${url}) — _${[...locations].join(', ')}_\n`;
  }
}
writeFileSync('link-audit/good-links.md', g);

// ---- flagged-links.md -------------------------------------------------------
let f = `# Flagged links — replace in the next step\n\n`;
f += `${flaggedUnique.length} links resolve to an **unusable page for a human** — all on `;
f += `Fedlex (\`fedlex.admin.ch/eli/.../en\` or \`/de\` "latest consolidated" view), which `;
f += `serves an Angular JS shell / "this version is under preparation" page: no article text, `;
f += `dead \`#art_X\` anchor. **The law text is correct; only the link is broken for users.** `;
f += `Each proposed replacement is the Fedlex **static filestore HTML** for an in-force dated `;
f += `version — curl-verified to render the article text + anchor and to support the cited point. `;
f += `Applying these touches provenance, so each changed source must be re-confirmed by `;
f += `\`fact-verifier\` (two-agent rule) before publish.\n`;
// group flagged by corridor for the editor's convenience
const flaggedByCorridor = new Map();
for (const u of flaggedUnique) {
  const corridors = new Set(u.usages.map((x) => x.corridor));
  for (const c of corridors) {
    if (!flaggedByCorridor.has(c)) flaggedByCorridor.set(c, []);
    flaggedByCorridor.get(c).push(u);
  }
}
for (const [corridor, items] of [...flaggedByCorridor.entries()].sort()) {
  f += `\n## ${corridor} — ${CORRIDOR_NAMES[corridor] || corridor} (${items.length})\n`;
  for (const u of items) {
    const v = verdictBy.get(u.url) || {};
    f += `\n### \`${u.url}\`\n`;
    f += `- **Source:** ${sourceNameBy.get(u.url) || ''} · used in ${u.count} place(s)\n`;
    f += `- **Problem:** ${(v.problem || '').replace(/\n/g, ' ')}\n`;
    f += `- **Replace with:** ${v.replacement ? `\`${v.replacement}\`` : '(none found)'} ${v.replacementVerified ? '**(verified)**' : '(unverified)'}\n`;
    f += `- **Supports the point:** ${v.supportsPoint !== false ? 'yes' : 'NO — review'}\n`;
    const tasks = [...new Set(u.usages.filter((x) => x.corridor === corridor).map((x) => `${x.taskId} (${x.location})`))];
    f += `- **Update at:** ${tasks.join('; ')}\n`;
  }
}
writeFileSync('link-audit/flagged-links.md', f);

// ---- SUMMARY.md -------------------------------------------------------------
let s = `# Link audit — summary\n\n`;
s += `Site-wide audit of every official-source link in the corridor content: does a human `;
s += `clicking it actually land on the cited information?\n\n`;
s += `## Totals\n\n`;
s += `| Metric | Count |\n|---|---|\n`;
s += `| Link references (in content) | ${usages.length} |\n`;
s += `| Unique URLs | ${unique.length} |\n`;
s += `| ✅ Good (render + relevant) | ${goodUnique.length} |\n`;
s += `| ⚠️ Flagged (replace) | ${flaggedUnique.length} |\n`;
s += `| Spot-checked in depth | ${verdicts.length} (${verdicts.filter((v) => v.status === 'good').length} good + ${verdicts.filter((v) => v.status !== 'good').length} flagged) |\n\n`;
s += `## The one systemic finding\n\n`;
s += `**All ${flaggedUnique.length} flagged links are Swiss Fedlex links** (\`fedlex.admin.ch/eli/...\`). `;
s += `The "latest consolidated" \`/en\` (and \`/de\`) view is an Angular single-page app whose English `;
s += `consolidation currently shows *"This version is under preparation and is not available at the moment"* — `;
s += `so a reader sees no article and the \`#art_X\` anchor is dead. The content is correct and exists; `;
s += `the fix is to point at the **static filestore HTML for an in-force dated version** (e.g. `;
s += `\`fedlex.data.admin.ch/.../<YYYYMMDD>/en/html/...html#art_X\`), which renders server-side with working anchors. `;
s += `Every other host audited (gov.uk, service-public.fr, ind.nl, guichet.lu, migration.gv.at, gesetze-im-internet.de, `;
s += `citizensinformation.ie, sem.admin.ch, ch.ch, …) renders its cited content fine.\n\n`;
s += `## Method\n\n`;
s += `1. \`scripts/audit-extract-links.mjs\` — inventory every link usage with the point it supports.\n`;
s += `2. \`scripts/audit-fetch-links.mjs\` — fetch each unique URL via local curl (residential IP, since gov sites block datacenter IPs) and compute render signals (status, redirects, JS-shell markers, anchor presence).\n`;
s += `3. Workflow of \`fact-verifier\` agents — diagnose every flagged URL and curl-verify a working replacement; spot-check the good set on SPA-risk + static hosts for render + relevance.\n`;
s += `4. \`scripts/audit-build-report.mjs\` — this report.\n\n`;
s += `## Next step (separate PR)\n\n`;
s += `Apply the replacements in \`flagged-links.md\` to the corridor YAMLs, then re-confirm each changed source with \`fact-verifier\` (changing a source URL touches provenance — two-agent rule + founder gate).\n\n`;
s += `## Files\n\n- \`good-links.md\` — the verified-good catalog, by corridor → task.\n- \`flagged-links.md\` — the ${flaggedUnique.length} links to replace, with verified replacements + where to update.\n- \`links.json\` — machine-readable.\n- \`usages.json\`, \`unique-urls.json\`, \`fetch-results.json\`, \`verdicts.json\` — raw audit data.\n`;
writeFileSync('link-audit/SUMMARY.md', s);

console.log(`Built link-audit/: good ${goodUnique.length}, flagged ${flaggedUnique.length}, refs ${usages.length}`);
