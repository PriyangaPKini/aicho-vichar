// Fenced code and images are removed before anything else looks at line
// starts, so a `- ` inside a code block is not mistaken for a list marker.
const stripBlocks = (markdown: string) =>
  markdown
    .replace(/^(```|~~~)[\s\S]*?^\1[^\n]*$/gm, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '');

const LIST_ITEM = /^ {0,3}([-*+]|\d+[.)]) +\S/m;

const HEADING = /^ {0,3}#{1,6} +\S/;

const isList = (block: string) => LIST_ITEM.test(block);
const isProse = (block: string) => !isList(block) && !HEADING.test(block);

/**
 * A flattened list reads as fragments in a preview, so the excerpt uses the
 * first unbroken run of paragraphs. Leading lists are skipped rather than cut
 * at, so a post that opens with one still gets a preview.
 */
const firstProseRun = (markdown: string) => {
  const blocks = markdown.split(/\n{2,}/).filter((block) => block.trim());
  const firstProse = blocks.findIndex(isProse);
  if (firstProse === -1) return '';

  const rest = blocks.slice(firstProse);
  const nextList = rest.findIndex(isList);

  return (nextList === -1 ? rest : rest.slice(0, nextList)).join('\n\n');
};

// Markdown syntax is stripped rule by rule rather than by deleting the marker
// characters outright, so prose like `snake_case`, `C#`, and `2 > 1` survives.
const stripInlineMarkdown = (markdown: string) =>
  markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^ *#{1,6} +/gm, '')
    .replace(/^ *> ?/gm, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    .replace(/(\*|_)(?=\S)(.+?)(?<=\S)\1/g, '$2')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]*)`/g, '$1');

export const excerptFromMarkdown = (markdown: string, maxLength = 260) => {
  const text = stripInlineMarkdown(firstProseRun(stripBlocks(markdown)))
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/ *\n */g, '\n')
    .trim();

  if (text.length <= maxLength) return text;

  return endOfSentence(text.slice(0, maxLength));
};

// An abbreviation like "e.g." looks exactly like a sentence end, so a break is
// only taken when it still leaves a preview worth reading.
const MIN_SENTENCE_RATIO = 0.6;

/** Prefer a clean sentence break; fall back to a whole word plus an ellipsis. */
const endOfSentence = (text: string) => {
  const lastSentence = text.match(/^[\s\S]*[.!?](?=["')\]]?(\s|$))/)?.[0].trim();
  if (lastSentence && lastSentence.length >= text.length * MIN_SENTENCE_RATIO) return lastSentence;

  return `${text.replace(/[^\S\n]+\S*$/, '')}…`;
};
