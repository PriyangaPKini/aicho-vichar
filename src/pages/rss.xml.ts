import type { APIRoute } from 'astro';
import { SITE_DESCRIPTION, SITE_TITLE } from '../constants';
import { getSortedCollection } from '../lib/content';

const escapeXml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const GET: APIRoute = async ({ site }) => {
  const posts = await getSortedCollection('blog');
  const siteUrl = site?.toString() ?? 'https://priyangapkini.com/';
  const rssUrl = new URL('/rss.xml', siteUrl).toString();
  const latestPostDate = posts[0]?.data.date;

  const items = posts.map((post) => {
    const postUrl = new URL(`/blog/${post.id}/`, siteUrl).toString();
    const description = post.data.description ?? '';

    return `
    <item>
      <title>${escapeXml(post.data.title)}</title>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="true">${escapeXml(postUrl)}</guid>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
      ${description ? `<description>${escapeXml(description)}</description>` : ''}
    </item>`;
  }).join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE_TITLE)}</title>
    <description>${escapeXml(SITE_DESCRIPTION)}</description>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(rssUrl)}" rel="self" type="application/rss+xml" />
    <language>en-us</language>
    ${latestPostDate ? `<lastBuildDate>${new Date(latestPostDate).toUTCString()}</lastBuildDate>` : ''}
    ${items}
  </channel>
</rss>
`, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
    },
  });
};
