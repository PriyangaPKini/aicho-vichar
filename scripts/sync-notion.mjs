#!/usr/bin/env node
/**
 * Sync posts from a Notion database into src/content/posts.
 *
 * Pulls every page where Status = "Done", converts the page body to markdown,
 * downloads embedded images locally (Notion file URLs expire), and writes
 * one .md file per post with frontmatter that matches src/content.config.ts.
 *
 * Env:
 *   NOTION_TOKEN       Notion internal integration secret.
 *   NOTION_BLOG_DB_ID  Database ID (UUID, with or without dashes).
 *
 * Usage:
 *   node scripts/sync-notion.mjs
 */

import { Client } from '@notionhq/client';
import { NotionToMarkdown } from 'notion-to-md';
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const POSTS_DIR = join(ROOT, 'src/content/posts');
const IMAGES_DIR = join(ROOT, 'public/images/posts');
const IMAGES_PUBLIC_PREFIX = '/images/posts';

await loadDotEnv(join(ROOT, '.env'));

const { NOTION_TOKEN, NOTION_BLOG_DB_ID } = process.env;
if (!NOTION_TOKEN) fail('NOTION_TOKEN is not set');
if (!NOTION_BLOG_DB_ID) fail('NOTION_BLOG_DB_ID is not set');

const notion = new Client({ auth: NOTION_TOKEN });
const n2m = new NotionToMarkdown({ notionClient: notion });

const dataSourceId = await resolveDataSourceId(NOTION_BLOG_DB_ID);
const pages = await queryPublishedPages(dataSourceId);
console.log(`Found ${pages.length} published page(s).`);

await mkdir(POSTS_DIR, { recursive: true });

for (const page of pages) {
  const post = extractProperties(page);
  if (!post.title || !post.date) {
    console.warn(`Skipping ${page.id}: missing Name or Date`);
    continue;
  }

  const slug = post.slug || deriveSlug(post.date, post.title);
  const body = await convertPageBody(page.id);
  const { markdown, downloaded } = await localiseImages(body, slug);

  const frontmatter = buildFrontmatter(post);
  const file = `${frontmatter}\n${markdown.trimEnd()}\n`;
  const path = join(POSTS_DIR, `${slug}.md`);

  await writeFile(path, file, 'utf8');
  console.log(`✓ ${slug}.md  (${downloaded} image${downloaded === 1 ? '' : 's'})`);
}

console.log('Done.');

// ---------- helpers ----------

async function resolveDataSourceId(databaseId) {
  const db = await notion.databases.retrieve({ database_id: databaseId });
  const sources = db.data_sources ?? [];
  if (sources.length === 0) fail(`Database ${databaseId} has no data sources`);
  if (sources.length > 1) {
    console.warn(`Database has ${sources.length} data sources; using the first ("${sources[0].name}")`);
  }
  return sources[0].id;
}

async function queryPublishedPages(dataSourceId) {
  const out = [];
  let cursor;
  do {
    const res = await notion.dataSources.query({
      data_source_id: dataSourceId,
      filter: { property: 'Status', status: { equals: 'Done' } },
      start_cursor: cursor,
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

function extractProperties(page) {
  const p = page.properties;
  return {
    title: plainText(p.Name?.title),
    date: p.Date?.date?.start,
    description: plainText(p.Description?.rich_text) || undefined,
    tags: (p.Tags?.multi_select ?? []).map((t) => t.name),
    canonicalUrl: p['Canonical URL']?.url || p['External URL']?.url || undefined,
    titleEmphasis: plainText(p['Title Emphasis']?.rich_text) || undefined,
    featured: p.Featured?.checkbox || undefined,
    slug: plainText(p.Slug?.rich_text) || undefined,
  };
}

function plainText(richText) {
  return (richText ?? []).map((t) => t.plain_text).join('').trim();
}

function deriveSlug(date, title) {
  const kebab = title
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['\u2018\u2019]/g, '') // strip ASCII + curly apostrophes so "don't" → "dont"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${date}-${kebab}`;
}

async function convertPageBody(pageId) {
  const blocks = await n2m.pageToMarkdown(pageId);
  return n2m.toMarkdownString(blocks).parent ?? '';
}

async function localiseImages(markdown, slug) {
  // Match markdown image syntax pointing at Notion-hosted URLs.
  const re = /!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/g;
  let downloaded = 0;
  let result = markdown;
  const matches = [...markdown.matchAll(re)];

  for (const m of matches) {
    const [whole, alt, url] = m;
    if (!isNotionHostedUrl(url)) continue;
    const localPath = await downloadImage(url, slug);
    if (localPath) {
      result = result.replace(whole, `![${alt}](${localPath})`);
      downloaded++;
    }
  }
  return { markdown: result, downloaded };
}

function isNotionHostedUrl(url) {
  return /(^https:\/\/(www\.)?notion\.so\/)|(s3\.[^/]+\.amazonaws\.com)|(prod-files-secure\.s3\.)/.test(url);
}

async function downloadImage(url, slug) {
  const dir = join(IMAGES_DIR, slug);
  await mkdir(dir, { recursive: true });
  const filename = filenameFromUrl(url);
  const dest = join(dir, filename);

  if (!existsSync(dest)) {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`! image fetch failed (${res.status}) for ${url}`);
      return null;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
  }
  return `${IMAGES_PUBLIC_PREFIX}/${slug}/${filename}`;
}

function filenameFromUrl(url) {
  const u = new URL(url);
  const last = u.pathname.split('/').filter(Boolean).pop() || 'image';
  // Strip query string and decode any URL-encoded chars.
  return decodeURIComponent(last);
}

function buildFrontmatter(post) {
  const lines = ['---', `title: ${quote(post.title)}`, `date: ${quote(post.date)}`];
  if (post.description) lines.push(`description: ${quote(post.description)}`);
  if (post.tags?.length) lines.push(`tags: [${post.tags.map(quote).join(', ')}]`);
  if (post.canonicalUrl) lines.push(`canonicalUrl: ${quote(post.canonicalUrl)}`);
  if (post.titleEmphasis) lines.push(`titleEmphasis: ${quote(post.titleEmphasis)}`);
  if (post.featured) lines.push(`featured: true`);
  lines.push('---');
  return lines.join('\n');
}

function quote(s) {
  return JSON.stringify(String(s));
}

async function loadDotEnv(path) {
  if (!existsSync(path)) return;
  const text = await readFile(path, 'utf8');
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

function fail(msg) {
  console.error(`Error: ${msg}`);
  process.exit(1);
}
