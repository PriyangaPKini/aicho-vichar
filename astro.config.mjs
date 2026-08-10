// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { codeTheme } from './src/lib/code-theme.mjs';

export default defineConfig({
  site: 'https://priyangapkini.com',
  output: 'static',
  integrations: [sitemap()],
  markdown: {
    shikiConfig: { theme: codeTheme },
  },
});
