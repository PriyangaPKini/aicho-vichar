import { SITE_AUTHOR } from '../constants';
import { formatLongDate } from './date';
import { excerptFromMarkdown } from './excerpt';

type Post = {
  body?: string;
  data: { date: string };
};

const WRITTEN_BY = `Written by\n${SITE_AUTHOR}`;

const joinSections = (sections: string[]) => sections.filter(Boolean).join('\n\n');

const postSummary = (post: Post) => excerptFromMarkdown(post.body ?? '');

/** Opening prose plus a byline, the shape every preview surface shares. */
export const previewDescription = (prose: string) =>
  joinSections([excerptFromMarkdown(prose), WRITTEN_BY]);

export const postPreviewDescription = (post: Post) =>
  joinSections([postSummary(post), WRITTEN_BY, formatLongDate(post.data.date)]);
