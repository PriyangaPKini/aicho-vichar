import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_IMAGE } from '../constants';

/**
 * A post opts into its own social card by dropping `thumbnail.png` into its
 * image folder — there is no frontmatter to keep in sync. Posts without one
 * fall back to the site-wide image rather than pointing at a missing file.
 */
export const postThumbnail = (postId: string) => {
  const path = `/images/blog/${postId}/thumbnail.png`;
  return existsSync(join(process.cwd(), 'public', path)) ? path : SITE_IMAGE;
};
