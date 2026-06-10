// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';

// NOTE: `site` is a placeholder until the production domain is registered.
// The sitemap + canonical URLs depend on it — update before launch.
const SITE = process.env.SITE_URL ?? 'https://relocation-guide.example';

// https://astro.build/config
export default defineConfig({
  site: SITE,
  // Static output for Cloudflare Pages (ADR-0001). Zero-JS by default; React
  // is loaded only inside explicit islands (`client:*`).
  output: 'static',
  integrations: [react(), tailwind(), sitemap()],
  // English-only at launch; structure is expansion-ready (ADR-0001).
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
