import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { sortByDateDesc } from './date';

export const getSortedCollection = async <C extends CollectionKey>(collection: C) =>
  (await getCollection(collection)).sort(sortByDateDesc) as CollectionEntry<C>[];

export const getLatestBlogPosts = async (limit: number) =>
  (await getSortedCollection('blog')).slice(0, limit);
