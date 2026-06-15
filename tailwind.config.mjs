/** @type {import('tailwindcss').Config} */

/*
 * Apple web design language (ADR-0022, supersedes ADR-0019).
 *
 * Tokens are exposed as CSS custom properties (defined in src/styles/global.css)
 * and surfaced to Tailwind as semantic names so the whole stack is dark-mode-ready
 * WITHOUT shipping a dark theme today (light values only are defined for now).
 *
 * Two ways to reach the same Apple palette:
 *   1. Semantic names (PREFERRED for new work): `text-label`, `text-secondaryLabel`,
 *      `bg-surface`, `bg-card`, `border-separator`, `text-accent`, `bg-accent`…
 *   2. The legacy `brand-*` scale, REMAPPED to Apple systemBlue. Every existing
 *      `brand-600` CTA / `text-brand-700` link / `focus-visible:ring-brand-500`
 *      keeps working and now renders Apple blue — no per-call-site edits needed.
 *
 * Contrast (verified): white on accent #0071e3 = 4.70:1 (AA); label #1d1d1f on
 * surface = 15.46:1; secondaryLabel #6e6e73 on white = 5.07:1, on surface = 4.66:1;
 * tertiaryLabel #6b6b70 on white = 5.30:1, on surface = 4.87:1 (AA). tertiaryLabel
 * was darkened from Apple web #86868b (~3.6:1, fails AA) so MEANINGFUL text using
 * it (e.g. "Unlocks after", the canton code badge, "(optional)" hints) clears
 * 4.5:1. Placeholders use secondaryLabel, not tertiaryLabel.
 */

const withVar = (name, fallback) => `var(${name}, ${fallback})`;

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  darkMode: 'class', // structure-only; no dark theme is built yet (ADR-0022)
  theme: {
    extend: {
      colors: {
        // ── Provenance status palette — Apple semantic system colors. Reused by
        //    the Provenance component and the build gate UI. Kept as a named scale.
        status: {
          verified: withVar('--color-success', '#248a3d'), // systemGreen (AA text on white)
          unverified: withVar('--color-warning', '#7a5b00'), // soft-warning text
          flagged: withVar('--color-danger', '#d70015'), // systemRed (AA text on white)
          stale: withVar('--color-danger', '#d70015'),
        },

        // ── Apple semantic tokens (the canonical vocabulary for new work) ──────
        // Text / labels
        label: withVar('--color-label', '#1d1d1f'),
        secondaryLabel: withVar('--color-secondary-label', '#6e6e73'),
        tertiaryLabel: withVar('--color-tertiary-label', '#6b6b70'),
        // Tint / accent (Apple systemBlue, web value)
        accent: {
          DEFAULT: withVar('--color-accent', '#0071e3'),
          hover: withVar('--color-accent-hover', '#0066cc'),
        },
        link: withVar('--color-link', '#0066cc'),
        // Surfaces
        surface: withVar('--color-surface', '#f5f5f7'),
        card: withVar('--color-card', '#ffffff'),
        // Lines
        separator: withVar('--color-separator', '#d2d2d7'),
        // Feedback
        success: withVar('--color-success', '#248a3d'),
        danger: withVar('--color-danger', '#d70015'),
        warning: {
          // "soft warning" — Apple-flavoured amber callout (bg + readable text)
          soft: withVar('--color-warning-soft', '#fff8e6'),
          border: withVar('--color-warning-border', '#f0d488'),
          DEFAULT: withVar('--color-warning', '#7a5b00'),
        },

        // ── Legacy brand scale, REMAPPED to the Apple systemBlue family ────────
        //    Verified AA at every stop used in the codebase (see ADR-0022).
        brand: {
          50: '#e8f2fd',
          100: '#d1e6fb',
          200: '#a6ccf6',
          300: '#6daeef',
          400: '#2b8ae8',
          500: '#0071e3', // ring/accent
          600: '#0071e3', // master CTA (white text = 4.70:1, AA)
          700: '#0066cc', // hover / link text (5.57:1)
          800: '#0058b0', // emphasis text (6.95:1)
          900: '#00428a', // strongest (9.78:1)
        },
      },
      fontFamily: {
        // SF system stack — no web font is fetched. EB Garamond + Lato retired
        // (ADR-0022). `serif` is intentionally aliased to the SAME system stack
        // so legacy `font-serif` display headings keep rendering without pulling
        // a serif web font; remove `font-serif` at call sites opportunistically.
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'SF Pro Text'",
          "'SF Pro Display'",
          "'Helvetica Neue'",
          'Arial',
          'system-ui',
          'sans-serif',
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
          '"Segoe UI Symbol"',
          '"Noto Color Emoji"',
        ],
        serif: [
          '-apple-system',
          'BlinkMacSystemFont',
          "'SF Pro Text'",
          "'SF Pro Display'",
          "'Helvetica Neue'",
          'Arial',
          'system-ui',
          'sans-serif',
        ],
      },
      borderRadius: {
        // Apple rhythm: inputs ~10–12px, cards 12–18px, pill CTAs 980px.
        field: '12px',
        card: '18px',
        pill: '980px',
      },
    },
  },
  plugins: [],
};
