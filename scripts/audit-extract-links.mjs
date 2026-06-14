// Phase 0 of the link audit (see DECISIONS.md / link-audit/SUMMARY.md):
// extract every link USAGE from the corridor content, with the exact point it
// supports, so each link can be render- and relevance-checked in context.
//
// Run: node scripts/audit-extract-links.mjs
// Output: link-audit/usages.json (every reference) + link-audit/unique-urls.json
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { parse } from 'yaml';

const dir = 'src/content/corridors/';
const files = readdirSync(dir).filter((f) => f.endsWith('.yaml'));
const usages = [];

function add(corridor, taskId, taskTitle, location, pointText, link) {
  if (!link || !link.sourceUrl) return;
  const url = String(link.sourceUrl);
  usages.push({
    corridor,
    taskId,
    taskTitle,
    location,
    point: (pointText || '').replace(/\s+/g, ' ').trim().slice(0, 220),
    linkText: link.text || link.sourceName || '',
    sourceName: link.sourceName || '',
    url,
    anchor: url.includes('#') ? url.split('#').slice(1).join('#') : null,
  });
}

for (const f of files) {
  const c = parse(readFileSync(dir + f, 'utf8'));
  const corridor = f.replace('.yaml', '');
  for (const t of c.tasks || []) {
    const tt = t.title || t.id;
    add(corridor, t.id, tt, 'summary', t.summary?.text, t.summary);
    if (t.tldr) add(corridor, t.id, tt, 'tldr', t.tldr.text, t.tldr);
    for (const kf of t.keyFacts || []) add(corridor, t.id, tt, `keyFact:${kf.label}`, kf.text, kf);
    (t.steps || []).forEach((s, i) => {
      for (const l of s.links || []) add(corridor, t.id, tt, `step${i + 1}`, s.text, l);
    });
    for (const d of t.documents || []) {
      if (d && typeof d === 'object' && d.form) add(corridor, t.id, tt, `document:${d.name}`, d.description || d.name, d.form);
    }
    if (t.timeline) add(corridor, t.id, tt, 'timeline', t.timeline.text, t.timeline);
    if (t.cost) add(corridor, t.id, tt, 'cost', t.cost.text, t.cost);
  }
}

const byUrl = new Map();
for (const u of usages) {
  if (!byUrl.has(u.url)) byUrl.set(u.url, []);
  byUrl.get(u.url).push(u);
}
const unique = [...byUrl.entries()]
  .map(([url, us]) => ({
    url,
    host: (url.match(/^https?:\/\/([^/]+)/) || [])[1] || '',
    anchor: url.includes('#') ? url.split('#').slice(1).join('#') : null,
    count: us.length,
    usages: us.map((x) => ({ corridor: x.corridor, taskId: x.taskId, location: x.location, point: x.point })),
  }))
  .sort((a, b) => b.count - a.count);

mkdirSync('link-audit', { recursive: true });
writeFileSync('link-audit/usages.json', JSON.stringify(usages, null, 2));
writeFileSync('link-audit/unique-urls.json', JSON.stringify(unique, null, 2));
console.log(`usages: ${usages.length}, unique URLs: ${unique.length}, hosts: ${new Set(unique.map((u) => u.host)).size}`);
