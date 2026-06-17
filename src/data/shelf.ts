export type ShelfItemType = 'book' | 'talk' | 'article' | 'podcast' | 'video';

export interface ShelfItem {
  type: ShelfItemType;
  title: string;
  creator: string;
  url: string;
  sourceName?: string;
  note?: string;
  date?: string;
}

export const SHELF_GROUPS: { type: ShelfItemType; label: string }[] = [
  { type: 'book', label: 'Books' },
  { type: 'talk', label: 'Talks' },
  { type: 'video', label: 'Videos' },
  { type: 'article', label: 'Articles' },
  { type: 'podcast', label: 'Podcasts' },
];

export const shelf: ShelfItem[] = [
  // Books
  {
    type: 'book',
    title: 'AI Engineering',
    creator: 'Chip Huyen',
    url: 'https://www.oreilly.com/library/view/ai-engineering/9781098166298/',
    sourceName: "O'Reilly Media",
    note: 'A grounded, end-to-end guide to building production LLM systems.',
    date: '2026-06-16',
  },
  {
    type: 'book',
    title: 'The Pragmatic Programmer',
    creator: 'David Thomas & Andrew Hunt',
    url: 'https://www.oreilly.com/library/view/the-pragmatic-programmer/9780135956977/',
    sourceName: "O'Reilly Media",
    note: 'Timeless principles for thinking about software craftsmanship — short, sharp, and worth revisiting every few years.',
    date: '2026-06-16',
  },
];
