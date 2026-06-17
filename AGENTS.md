# AGENTS.md

Guidance for AI agents (and humans) working in this repo. Read this before making changes.

For cross-project conventions, see `~/.claude/rules/` (`contributing.md`, `coding-principles.md`). This file documents only what is **specific to aicho-vichar**.

---

## What this is

`aicho-vichar` is a personal site — a space to put my thoughts down. Static Astro site, deployed to Netlify at <https://aicho-vichar.netlify.app/>.

## Stack

- **Astro** ≥ 6 (`output: 'static'`), Node ≥ 22.12.0.
- **`@astrojs/sitemap`** — generates `sitemap-index.xml` at build.
- **Fuse.js** — client-side fuzzy search (Cmd/Ctrl+K).
- **Firebase** — Auth (Google sign-in) + Firestore for threaded comments. Client SDK only; no server. Keys live in `PUBLIC_FIREBASE_*` env vars.
- **Fonts** — Fraunces (display) + Inter (body) via Google Fonts, loaded in `BaseLayout.astro`.
- No CSS framework — plain CSS in `src/styles/global.css`.
- No tests yet.

## Layout

```
src/
├── components/
│   ├── auth/          # SignInModal, SignUpModal
│   ├── blog/          # BlogListItem, PostHeader, PostNavigation, TableOfContents, …
│   ├── comments/      # threaded comments UI
│   ├── layout/        # SiteHeader, SiteFooter
│   ├── search/        # reusable Search component + client behavior
│   ├── shelf/         # ShelfListItem
│   └── ui/            # Icons, IconLink
├── content/
│   ├── blog/          # markdown posts; one .md per post
│   └── shelf.yml      # shelf recommendations
├── content.config.ts  # zod schemas for content collections
├── layouts/           # BaseLayout
├── lib/               # Firebase client + content/date/search/url helpers
├── pages/
│   ├── blog/
│   │   ├── index.astro
│   │   └── [slug].astro
│   ├── index.astro
│   └── shelf.astro
├── styles/            # CSS modules imported by global.css
├── constants.ts       # site-wide constants
└── utils.ts
public/                # static assets (avatar, gallery, blog images)
scripts/
└── sync-notion.mjs    # mirror Notion DB → src/content/blog
```

## Content

Blog posts live in `src/content/blog/*.md` and must satisfy the schema in `src/content.config.ts`:

| Field | Required | Notes |
|---|---|---|
| `title` | ✅ | string |
| `date` | ✅ | ISO date string |
| `description` | optional | shown in lists / OG meta |
| `tags` | optional | string[] |
| `canonicalUrl` | optional | if set, post still renders on-site with an "Originally published on …" callout linking to the source |
| `titleEmphasis` | optional | substring of the title to render in gold italic; auto-falls back to the tail after a `:`, `—`, or `–` |
| `featured` | optional | bumps the post to the top with a star icon |

Shelf items live in `src/content/shelf.yml` and must satisfy the `shelf` schema in `src/content.config.ts`. Add one YAML entry per recommendation; the `note` field is used in the list and search text.

When adding fields, update the schema **and** any consuming components (`BlogListItem.astro`, `ShelfListItem.astro`, `blog/[slug].astro`, `scripts/sync-notion.mjs`) in the same PR.

## Commands

```sh
npm install          # install deps (Node ≥ 22.12.0)
npm run dev          # local dev at http://localhost:4321
npm run build        # static build to ./dist
npm run preview      # serve ./dist locally
npm run sync:notion  # pull blog content from Notion into src/content/blog
npm run astro …      # raw Astro CLI (e.g. `astro check`)
```

## Workflow

- **`main` is protected.** No direct pushes. Every change lands via PR + squash/rebase merge (linear history is enforced).
- **Branches:** `<type>/<short-desc>` where `<type>` ∈ `feat`, `fix`, `refactor`, `chore`. See `~/.claude/rules/contributing.md`.
- **Commits:** `<Operation>. <lowercase summary>` (e.g. `Add. rss feed`). Atomic; project must build at every commit.
- **PR body** uses the template from `~/.claude/rules/contributing.md`:
  ```
  ## Because
  ## This addresses
  ## Test Plan
  ```
- **Never merge or push without explicit user request.**
- **Never `git add -A` blindly** — review staged files first; `TODO.md` and similar local notes are git-ignored on purpose.

## Content sync (Notion)

- Source of truth: a Notion database — each page with `Status = Done` becomes one markdown post.
- Script: `scripts/sync-notion.mjs`. Maps Notion properties → frontmatter (see `src/content.config.ts`), converts the body to markdown, and downloads embedded images to `public/blog-images/<slug>/` (Notion file URLs expire).
- Notion property → frontmatter mapping:

  | Notion property | Frontmatter field |
  |---|---|
  | `Name` (title) | `title` |
  | `Date` | `date` |
  | `Description` | `description` |
  | `Tags` (multi-select) | `tags` |
  | `Canonical URL` (or legacy `External URL`) | `canonicalUrl` |
  | `Title Emphasis` (rich text) | `titleEmphasis` |
  | `Featured` (checkbox) | `featured` |
  | `Slug` | filename (falls back to `<date>-<kebab-title>`) |

- Workflow: `.github/workflows/sync-notion.yml` (manual `workflow_dispatch`). Runs the script and opens a `chore/sync-notion` PR via `peter-evans/create-pull-request` if anything changed. Review the diff, then merge. Run **Deploy to Netlify** manually afterwards to ship.
- Local run: copy `.env.example` to `.env` and fill in `NOTION_TOKEN` + `NOTION_BLOG_DB_ID`, then `npm run sync:notion`.
- Required repo secret: `NOTION_TOKEN`. The database ID is committed in the workflow env (it's not sensitive).
- The sync **does not delete** posts that disappear from Notion. Remove stale `.md` files manually if needed.

## Cross-posts and canonical attribution

- Posts that originated elsewhere (e.g. the nilenso blog) still get a real page on this site — they are not redirected. The full body lives in `src/content/blog/<slug>.md` and the post page renders normally.
- Setting `canonicalUrl` triggers an "Originally published on …" callout at the end of the article. The source label is derived from the URL hostname (`new URL(canonicalUrl).hostname.replace(/^www\./, '')`), so any publisher works.
- When cross-posting, self-host the assets under `public/images/blog/<slug>/` rather than hot-linking from the source.

## Comments & auth

- Threaded comments live in a flat Firestore `comments` collection, filtered per post by `postSlug`. Each document carries `postSlug`, `parentId`, `userId`, `userName`, `text`, and `createdAt`.
- Sign-in is Google-only via Firebase Auth popup (no email/password). `SignInModal.astro` and `SignUpModal.astro` are the UI; `src/lib/firebase.ts` exposes `signInWithGoogle`, `signOut`, `addComment`, `subscribeToComments`, etc.
- All client-side. No server APIs, no SSR. Firestore security rules govern who can write — check there before changing the comment shape.

## Deployment

- GitHub Actions workflow: `.github/workflows/deploy.yml`.
- **Manual `workflow_dispatch` only** — merging to `main` does not auto-deploy. Trigger from the Actions tab when you're ready to ship.
- Builds with `npm ci && npm run build`, then `npx netlify-cli deploy --dir=dist --prod`.
- Required repo secrets: `NETLIFY_AUTH_TOKEN`, `NETLIFY_PROJECT_ID` (mapped to `NETLIFY_SITE_ID` for the CLI).
- Netlify's built-in continuous deployment is **disabled** — GitHub Actions is the single source of deploys.

## Conventions

- **Indentation:** 2 spaces. Match surrounding style.
- **Quotes:** single quotes in TS, double quotes in HTML attributes (Astro default).
- **Imports:** relative paths inside `src/` — no path aliases configured.
- **No new dependencies** without a clear reason. Prefer the platform / vanilla over libraries.
- **Static-only.** No SSR routes, no adapters. If a feature needs a server, host it externally and call it from the client.

## Things to watch

- The `site:` URL in `astro.config.mjs` (`https://aicho-vichar.netlify.app`) drives the sitemap. Update it if a custom domain goes live.
- Cmd+K search is built at runtime against `fuse.js` over the blog collection. Keep `description` populated for better hit quality.
