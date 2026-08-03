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

const cdata = (value: string) => `<![CDATA[ ${value.replaceAll(']]>', ']]]]><![CDATA[>')} ]]>`;

const absolutizeUrls = (html: string, siteUrl: string) =>
  html.replace(/\b(src|href)="\/(?!\/)([^"]*)"/g, (_, attr: string, path: string) => {
    return `${attr}="${new URL(`/${path}`, siteUrl).toString()}"`;
  });

export const GET: APIRoute = async ({ site }) => {
  const posts = await getSortedCollection('blog');
  const siteUrl = site?.toString() ?? 'https://priyangapkini.com/';
  const rssUrl = new URL('/rss.xml', siteUrl).toString();
  const avatarUrl = new URL('/avatar.jpg', siteUrl).toString();
  const latestPostDate = posts[0]?.data.date;

  const items = posts.map((post) => {
    const postUrl = new URL(`/blog/${post.id}/`, siteUrl).toString();
    const description = post.data.description ?? '';
    const content = absolutizeUrls(post.rendered?.html ?? '', siteUrl);

    return `
    <item>
      <title>${cdata(post.data.title)}</title>
      <description>${cdata(description)}</description>
      <link>${escapeXml(postUrl)}</link>
      <guid isPermaLink="false">${escapeXml(post.id)}</guid>
      <dc:creator>${cdata(SITE_TITLE)}</dc:creator>
      <pubDate>${new Date(post.data.date).toUTCString()}</pubDate>
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
