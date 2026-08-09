import { describe, expect, it } from 'vitest';
import { SITE_AUTHOR } from '../constants';
import { postPreviewDescription, previewDescription } from './preview';

const BYLINE = `Written by\n${SITE_AUTHOR}`;

const aPost = (overrides: { body?: string; description?: string } = {}) => ({
  body: overrides.body,
  data: { description: overrides.description, date: '2026-06-25' },
});

describe('previewDescription', () => {
  it('puts a byline under the prose', () => {
    expect(previewDescription('An opening line.')).toBe(`An opening line.\n\n${BYLINE}`);
  });

  it('omits the summary rather than leaving a blank gap above the byline', () => {
    expect(previewDescription('')).toBe(BYLINE);
  });
});

describe('postPreviewDescription', () => {
  it('reads from the opening of the body, then the byline and date', () => {
    const description = postPreviewDescription(aPost({ description: 'Hand-written copy.', body: 'Body opening.' }));

    expect(description).toBe(`Body opening.\n\n${BYLINE}\n\nJune 25, 2026`);
  });

  it('ignores the hand-written description because previews should start from the body', () => {
    expect(postPreviewDescription(aPost({ description: 'Hand-written copy.' }))).toBe(
      `${BYLINE}\n\nJune 25, 2026`,
    );
  });

  it('falls back to the body when the description is missing and the body opens with a list', () => {
    expect(postPreviewDescription(aPost({ body: '- a\n- b\n\nProse after.' }))).toBe(
      `Prose after.\n\n${BYLINE}\n\nJune 25, 2026`,
    );
  });

  it('drops the summary entirely when neither source yields one', () => {
    expect(postPreviewDescription(aPost())).toBe(`${BYLINE}\n\nJune 25, 2026`);
  });
});
