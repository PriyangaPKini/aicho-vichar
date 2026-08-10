import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: z.object({
    title: z.string(),
    date: z.string(),
    description: z.string().optional(),
    tags: z.array(z.string()).optional(),
    canonicalUrl: z.string().optional(),
    titleEmphasis: z.string().optional(),
    featured: z.boolean().optional(),
  }),
});

const shelf = defineCollection({
  loader: file('src/content/shelf.yml'),
  schema: z.object({
    type: z.enum(['book', 'talk', 'article', 'podcast', 'video']),
    title: z.string(),
    creator: z.string(),
    url: z.string().url(),
    sourceName: z.string().optional(),
    date: z.string().optional(),
    note: z.string(),
  }),
});

export const collections = { posts, shelf };
