/**
 * normalize-source.mjs — deterministic source normalization + hashing (ADR-0017).
 *
 * The snapshot cache compares the *normalized text* of an official source, not
 * its raw bytes, so drift detection survives cosmetic markup churn (whitespace,
 * attribute reordering) while catching real content changes. For hashes to be
 * stable across runs, machines, and OSes, normalization MUST be deterministic:
 * NO Date, NO locale, NO randomness, NO environment input. Same input → same
 * `{ text, sha256 }`, always.
 *
 * Exports:
 *   normalizeSource(input, contentType) => { text, sha256 }
 *   hashText(text) => <sha256 hex>
 *
 * HTML normalization (contentType contains "html"):
 *   1. strip <script>…</script> and <style>…</style> blocks (incl. content)
 *   2. remove all remaining tags
 *   3. decode a minimal entity set (&amp; &lt; &gt; &quot; &#39; &nbsp;)
 *   4. collapse all whitespace runs to a single space; trim
 * Non-HTML: treat as plain text → whitespace-normalize only (steps 4).
 */

import { createHash } from 'node:crypto';

/** SHA-256 hex of the UTF-8 bytes of `text`. */
export function hashText(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Collapse every run of whitespace (incl. newlines/tabs) to one space, trim. */
function collapseWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim();
}

/**
 * Decode only the minimal entity set the spec names. Ordering matters: decode
 * &amp; LAST so we never double-decode an already-decoded "&" (e.g. "&amp;lt;"
 * must stay "&lt;", not become "<").
 */
function decodeEntities(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/**
 * Normalize a source into stable, comparable text + its sha256.
 * @param {string} input        raw source content (HTML or plain text)
 * @param {string} [contentType] MIME type; "html" anywhere → HTML path
 * @returns {{ text: string, sha256: string }}
 */
export function normalizeSource(input, contentType = '') {
  const raw = String(input ?? '');
  const isHtml = /html/i.test(String(contentType ?? ''));

  let text;
  if (isHtml) {
    text = raw
      // strip script/style blocks (content included) before tag removal
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      // remove all remaining tags
      .replace(/<[^>]+>/g, ' ');
    text = decodeEntities(text);
    text = collapseWhitespace(text);
  } else {
    text = collapseWhitespace(raw);
  }

  return { text, sha256: hashText(text) };
}
