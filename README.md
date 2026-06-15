# aiche-vichar

A space to put my thoughts down.

## Stack

- [Astro](https://astro.build) (static output)
- [`@astrojs/sitemap`](https://docs.astro.build/en/guides/integrations-guide/sitemap/)
- [Fuse.js](https://www.fusejs.io/) for client-side search

## Development

Requires Node `>=22.12.0`.

```sh
npm install
npm run dev      # start dev server at localhost:4321
npm run build    # build to ./dist/
npm run preview  # preview the production build
```

## Project layout

```
src/
├── components/
├── content/         # blog posts, books, etc.
├── layouts/
├── pages/
│   ├── api/
│   ├── blog/
│   ├── books/
│   ├── about.astro
│   └── index.astro
├── styles/
├── constants.ts
├── content.config.ts
└── utils.ts
```
