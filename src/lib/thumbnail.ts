import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { SITE_IMAGE } from '../constants';

/**
 * A post opts into its own social card by dropping `thumbnail.png` into its
 * image folder. If it does not have one, fall back to the first in-post hero
 * image, then the site-wide image.
 */
export const postThumbnail = (postId: string) => {
  const imagePaths = [
    `/images/posts/${postId}/thumbnail.png`,
    `/images/posts/${postId}/hero.png`,
  ];

  return imagePaths.find((path) => existsSync(join(process.cwd(), 'public', path))) ?? SITE_IMAGE;
};
