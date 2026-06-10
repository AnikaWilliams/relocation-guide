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
      },
    },
  },
  plugins: [],
};
