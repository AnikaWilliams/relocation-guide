import { describe, it, expect } from 'vitest';
// Note: the .mjs library ships no type declarations; tsc resolves the ESM import fine.
import { normalizeSource, hashText } from '../scripts/lib/normalize-source.mjs';

/**
 * Source normalization (ADR-0017) must be DETERMINISTIC and OFFLINE: no network,
 * no Date, no locale. The drift hash is only meaningful if the same source bytes
 * always normalize to the same text and the same sha256. These tests pin both
 * the exact normalized text and a hardcoded expected hash (computed during dev)
 * so any accidental change to the normalization rules fails loudly.
 */

// A small HTML fixture exercising every normalization rule:
// - <title> kept (not script/style)        - <style>/<script> blocks stripped whole
// - entities decoded (&amp; &nbsp; &#39; &quot; &lt; &gt;)
// - whitespace runs (incl. newlines/tabs) collapsed to single spaces; trimmed
const HTML_FIXTURE = `<!DOCTYPE html>
<html><head><title>Permit fees</title>
<style>.x{color:red}</style>
<script>var a = 1 < 2 && 3 > 0;</script>
</head>
<body>
  <h1>Fee &amp; quota</h1>
  <p>The fee is&nbsp;CHF&nbsp;95.   It&#39;s &quot;per applicant&quot;.</p>
  <p>5 &lt; 10 &gt; 2</p>
</body></html>`;

// Expected outputs — computed once during development, pasted here as the pin.
const EXPECTED_TEXT =
  'Permit fees Fee & quota The fee is CHF 95. It\'s "per applicant". 5 < 10 > 2';
const EXPECTED_SHA =
  '2cae2f3001c603d9a0eb2d7e0ee24445928b82f3d6938be5885e7c095bceee9b';

describe('normalizeSource (HTML)', () => {
  it('strips script/style, removes tags, decodes minimal entities, collapses whitespace', () => {
    const { text } = normalizeSource(HTML_FIXTURE, 'text/html; charset=utf-8');
    expect(text).toBe(EXPECTED_TEXT);
  });

  it('produces the pinned sha256 for the normalized text', () => {
    const { sha256 } = normalizeSource(HTML_FIXTURE, 'text/html');
    expect(sha256).toBe(EXPECTED_SHA);
    // sha256 is exactly hashText(text) — internal consistency.
    const { text } = normalizeSource(HTML_FIXTURE, 'text/html');
    expect(sha256).toBe(hashText(text));
  });

  it('is deterministic — two calls return byte-identical output', () => {
    const a = normalizeSource(HTML_FIXTURE, 'text/html');
    const b = normalizeSource(HTML_FIXTURE, 'text/html');
    expect(a.text).toBe(b.text);
    expect(a.sha256).toBe(b.sha256);
  });

  it('detects HTML from any content-type containing "html" (e.g. application/xhtml+xml)', () => {
    const fromXhtml = normalizeSource(HTML_FIXTURE, 'application/xhtml+xml');
    expect(fromXhtml.text).toBe(EXPECTED_TEXT);
  });
});

describe('normalizeSource (non-HTML)', () => {
  it('whitespace-normalizes plain text without touching angle brackets or entities', () => {
    const { text } = normalizeSource('  hello\n\tworld   foo  ', 'text/plain');
    expect(text).toBe('hello world foo');
  });

  it('leaves "tags" and entities intact when the source is not HTML', () => {
    // No html in contentType → no tag stripping, no entity decoding.
    const { text } = normalizeSource('a < b &amp; c', 'text/plain');
    expect(text).toBe('a < b &amp; c');
  });

  it('treats an empty/unknown content type as plain text', () => {
    const { text } = normalizeSource('  spaced   out  ');
    expect(text).toBe('spaced out');
  });
});

describe('hashText', () => {
  it('is the SHA-256 hex of the UTF-8 text', () => {
    // SHA-256 of the empty string — a well-known constant.
    expect(hashText('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches the sha256 returned by normalizeSource', () => {
    const { text, sha256 } = normalizeSource(HTML_FIXTURE, 'text/html');
    expect(hashText(text)).toBe(sha256);
  });
});
