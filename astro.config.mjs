// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aicho-vichar.netlify.app',
  output: 'static',
  integrations: [sitemap()],
});
