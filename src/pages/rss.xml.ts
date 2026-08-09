import { statSync } from 'node:fs';
import { join } from 'node:path';
import type { APIRoute } from 'astro';
import { SITE_AUTHOR, SITE_DESCRIPTION, SITE_TITLE } from '../constants';
import { getSortedCollection } from '../lib/content';
import { postPreviewDescription } from '../lib/preview';
import { postThumbnail } from '../lib/thumbnail';
import { hostnameFromUrl } from '../lib/url';

const MIME_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  svg: 'image/svg+xml',
};

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const cdata = (value: string) => `<![CDATA[ ${value.replaceAll(']]>', ']]]]><![CDATA[>')} ]]>`;

const rssImagePath = (path: string) => {
  if (path.startsWith('images/blog/') && path.endsWith('.svg')) {
    return path.replace(/\.svg$/, '.png');
  }

  return path;
};

const imageAlt = (attrs: string) => {
  const match = attrs.match(/\balt="([^"]*)"/);
  return match?.[1] ?? '';
};

const addImageImportAttrs = (attrs: string) => {
  const withClass = /\bclass=/.test(attrs) ? attrs : `${attrs} class="kg-image"`;
  return /\bloading=/.test(withClass) ? withClass : `${withClass} loading="lazy"`;
};

const formatImages = (html: string) =>
  html
    .replace(/<p><img\s+([^>]*)><\/p>/g, (_, attrs: string) => {
      const alt = imageAlt(attrs);
      const caption = alt
        ? `<figcaption><span style="white-space: pre-wrap;">${escapeXml(alt)}</span></figcaption>`
        : '';

      return `<figure class="kg-card kg-image-card${alt ? ' kg-card-hascaption' : ''}"><img ${addImageImportAttrs(attrs)}>${caption}</figure>`;
    })
    .replace(/<img\s+([^>]*)>/g, (_, attrs: string) => `<img ${addImageImportAttrs(attrs)}>`);

const replaceTablesForImport = (html: string, siteUrl: string) =>
  html.replace(/<table>[\s\S]*?<\/table>/g, (table) => {
    if (!table.includes('LLM pipeline')) return table;

    const imageUrl = new URL('/images/blog/2026-05-18-evals-before-prompts-building-an-llm-ocr-for-kyc/metrics-table.png', siteUrl).toString();
    return `<figure class="kg-card kg-image-card kg-card-hascaption"><img src="${imageUrl}" alt="Table comparing third-party and LLM pipeline accuracy, latency, and cost metrics." class="kg-image" loading="lazy" width="1200" height="430"><figcaption><span style="white-space: pre-wrap;">Third-party vs LLM pipeline metrics.</span></figcaption></figure>`;
  });

const absolutizeUrls = (html: string, siteUrl: string) =>
  formatImages(replaceTablesForImport(html, siteUrl).replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, (_, attr: string, path: string) => {
    return `${attr}="${new URL(`/${rssImagePath(path)}`, siteUrl).toString()}"`;
  }));

// RSS enclosures need a byte length, so read it off the file in public/ at build time.
const buildEnclosure = (thumbnail: string | undefined, siteUrl: string) => {
  if (!thumbnail) return '';

  const extension = thumbnail.split('.').pop()?.toLowerCase() ?? '';
  const type = MIME_TYPES[extension];
  if (!type) return '';

  const path = join(process.cwd(), 'public', thumbnail);
  let length: number;
  try {
    length = statSync(path).size;
  } catch {
    return '';
  }

  const url = new URL(thumbnail, siteUrl).toString();
  return `<enclosure url="${escapeXml(url)}" length="${length}" type="${type}" />`;
};

export const GET: APIRoute = async ({ site }) => {
  const posts = await getSortedCollection('blog');
  const siteUrl = site?.toString() ?? 'https://priyangapkini.com/';
  const rssUrl = new URL('/rss.xml', siteUrl).toString();
  const avatarUrl = new URL('/avatar.jpg', siteUrl).toString();
  const latestPostDate = posts[0]?.data.date;

  const items = posts.map((post) => {
    const postUrl = new URL(`/blog/${post.id}/`, siteUrl).toString();
    const description = postPreviewDescription(post);
    const canonicalCallout = post.data.canonicalUrl
      ? `<blockquote><p>Originally published on <a href="${escapeXml(post.data.canonicalUrl)}">${escapeXml(hostnameFromUrl(post.data.canonicalUrl))}</a>.</p></blockquote>`
      : '';
    const content = absolutizeUrls(`${post.rendered?.html ?? ''}${canonicalCallout}`, siteUrl);
    const thumbnail = postThumbnail(post.id);
    const thumbnailUrl = new URL(thumbnail, siteUrl).toString();

    return `
    <item>
      <title>${cdata(post.data.title)}</title>
      <description>${cdata(description)}</description>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="false">${escapeXml(post.id)}</guid>
      <dc:creator>${cdata(SITE_AUTHOR)}</dc:creator>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
      <media:content url="${escapeXml(thumbnailUrl)}" medium="image" />
      <media:thumbnail url="${escapeXml(thumbnailUrl)}" />
      ${buildEnclosure(thumbnail, siteUrl)}
      <content:encoded>${cdata(content)}</content:encoded>
    </item>`;
  }).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
  <channel>
    <title>${cdata(SITE_TITLE)}</title>
    <description>${cdata(SITE_DESCRIPTION)}</description>
    <link>${escapeXml(siteUrl)}</link>
    <image>
      <url>${escapeXml(avatarUrl)}</url>
      <title>${escapeXml(SITE_TITLE)}</title>
      <link>${escapeXml(siteUrl)}</link>
    </image>
    <generator>Astro</generator>
    ${latestPostDate ? `<lastBuildDate>${new Date(latestPostDate).toUTCString()}</lastBuildDate>` : ''}
    <atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml" />
    <ttl>60</ttl>
    ${items}
  </channel>
</rss>
`, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
