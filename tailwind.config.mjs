/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Provenance status palette — reused by the Provenance component and gate UI.
        status: {
          verified: '#15803d', // green-700
          unverified: '#b45309', // amber-700
          flagged: '#b91c1c', // red-700
          stale: '#7c2d12', // orange-900
        },
        // Brand palette ("Trust & Authority"). brand-600 is the master CTA color
        // (white text on brand-600 = 5.93:1 contrast, AA pass); brand-700 = hover.
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Lato', 'ui-sans-serif', 'system-ui', 'sans-serif', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', '"Noto Color Emoji"'],
        serif: ['"EB Garamond"', 'ui-serif', 'Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
};
