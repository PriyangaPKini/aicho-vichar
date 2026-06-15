// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://aiche-vichar.netlify.app',
  output: 'static',
  integrations: [sitemap()],
});
