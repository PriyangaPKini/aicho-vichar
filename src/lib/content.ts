import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { sortByDateDesc } from './date';

export const getSortedCollection = async <C extends CollectionKey>(collection: C) =>
  (await getCollection(collection)).sort(sortByDateDesc) as CollectionEntry<C>[];

export const getLatestPosts = async (limit: number) =>
  (await getSortedCollection('posts')).slice(0, limit);
