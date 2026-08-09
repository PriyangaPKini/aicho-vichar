import { describe, expect, it } from 'vitest';
import { excerptFromMarkdown } from './excerpt';

const paragraph = (sentences: number) =>
  Array.from({ length: sentences }, (_, i) => `Sentence number ${i} runs on for a while.`).join(' ');

describe('excerptFromMarkdown', () => {
  it('returns short prose unchanged', () => {
    expect(excerptFromMarkdown('A single opening line.')).toBe('A single opening line.');
  });

  it('keeps paragraph breaks between blocks', () => {
    expect(excerptFromMarkdown('First para.\n\nSecond para.')).toBe('First para.\n\nSecond para.');
  });

  describe('markdown syntax', () => {
    it('unwraps emphasis, code, and links', () => {
      expect(excerptFromMarkdown('A **bold** and *italic* and `coded` [link](/x).')).toBe(
        'A bold and italic and coded link.',
      );
    });

    it('drops headings, blockquote markers, and images', () => {
      expect(excerptFromMarkdown('## Heading\n\n> Quoted line.\n\n![alt](/hero.png)Trailing.')).toBe(
        'Quoted line.\n\nTrailing.',
      );
    });

    it('removes fenced code in both fence styles', () => {
      expect(excerptFromMarkdown('Before.\n\n```js\nconst x = 1;\n```\n\nAfter.')).toBe('Before.\n\nAfter.');
      expect(excerptFromMarkdown('Before.\n\n~~~js\nconst x = 1;\n~~~\n\nAfter.')).toBe('Before.\n\nAfter.');
    });

    it('leaves prose that merely looks like syntax intact', () => {
      const prose = 'Prose with snake_case, C#, and 2 > 1 kept intact.';
      expect(excerptFromMarkdown(prose)).toBe(prose);
    });
  });

  describe('lists', () => {
    it('stops before the first list', () => {
      expect(excerptFromMarkdown('Opening.\n\nSecond.\n\n- a\n- b\n\nTrailing.')).toBe('Opening.\n\nSecond.');
    });

    it('stops before an ordered list', () => {
      expect(excerptFromMarkdown('Opening.\n\n1. a\n2. b')).toBe('Opening.');
    });

    it('skips a leading list rather than returning nothing', () => {
      expect(excerptFromMarkdown('- a\n- b\n\nProse after the list.')).toBe('Prose after the list.');
    });

    it('skips a leading heading, which is not a paragraph', () => {
      expect(excerptFromMarkdown('# Title\n\nProse after.')).toBe('Prose after.');
    });

    it('returns nothing when there is no prose at all', () => {
      expect(excerptFromMarkdown('- a\n- b')).toBe('');
    });

    it('does not mistake a dash inside fenced code for a list', () => {
      expect(excerptFromMarkdown('Opening.\n\n```sh\n- not a list\n```\n\nStill prose.')).toBe(
        'Opening.\n\nStill prose.',
      );
    });
  });

  describe('truncation', () => {
    it('trims to the last complete sentence within the limit', () => {
      const excerpt = excerptFromMarkdown(paragraph(20));

      expect(excerpt.endsWith('.')).toBe(true);
      expect(excerpt).not.toContain('…');
      expect(excerpt.length).toBeLessThanOrEqual(260);
    });

    it('falls back to a whole word plus an ellipsis when no sentence break qualifies', () => {
      const excerpt = excerptFromMarkdown(`Some prose here about tooling, e.g. ${'x'.repeat(240)}`);

      expect(excerpt.endsWith('…')).toBe(true);
      // The abbreviation must not be mistaken for a sentence end and gut the excerpt.
      expect(excerpt.length).toBeGreaterThan(35);
    });

    it('honours a caller-supplied limit', () => {
      expect(excerptFromMarkdown(paragraph(20), 80).length).toBeLessThanOrEqual(80);
    });
  });
});
