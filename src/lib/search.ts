import type { CollectionEntry } from 'astro:content';

export interface SearchItem {
  title: string;
  body: string;
  tags?: string[];
  date?: string;
  href: string;
  external?: boolean;
}

export const markdownToSearchText = (markdown = '') =>
  markdown
    .replace(/^---[\s\S]*?---/, '')
    .replace(/[#*`>\[\]()!_~]/g, '')
    .trim();

export const blogToSearchItem = (post: CollectionEntry<'blog'>): SearchItem => ({
  title: post.data.title,
  body: markdownToSearchText(post.body),
  tags: post.data.tags || [],
  date: post.data.date,
  href: `/blog/${post.id}`,
  external: false,
});

export const shelfToSearchItem = (item: CollectionEntry<'shelf'>): SearchItem => ({
  title: item.data.title,
  body: [item.data.note, item.data.creator, item.data.sourceName, item.data.type].filter(Boolean).join(' '),
  tags: [item.data.type, item.data.creator, item.data.sourceName].filter(Boolean),
  date: item.data.date,
  href: item.data.url,
  external: true,
});
