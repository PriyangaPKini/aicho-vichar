/**
 * Shiki theme built from the site tokens in src/styles/tokens.css.
 *
 * Every foreground here clears WCAG AA (4.5:1) against the --card-bg code
 * surface. The gold accent is deliberately absent: at 2.27:1 on cream it is
 * unreadable as text, so maroon carries the accent role instead.
 */
const cream = '#f5efe1'; // --card-bg
const text = '#1a1a1a';
const muted = '#6b6258';
const maroon = '#8b2c2c';
const bronze = '#7a4a12';
const green = '#2f5d3f';
const blue = '#1e4d78';
const plum = '#5c3566';

const token = (scope, foreground, fontStyle) => ({
  scope,
  settings: fontStyle ? { foreground, fontStyle } : { foreground },
});

export const codeTheme = {
  name: 'aicho-vichar-light',
  type: 'light',
  colors: {
    'editor.background': cream,
    'editor.foreground': text,
  },
  settings: [
    token(['comment', 'punctuation.definition.comment'], muted, 'italic'),
    token(['keyword', 'storage', 'storage.type', 'keyword.control'], maroon),
    token(['entity.name.function', 'support.function', 'meta.function-call'], plum),
    token(['string', 'string.quoted', 'punctuation.definition.string'], green),
    token(['constant.numeric', 'constant.language', 'constant.character'], blue),
    token(['entity.name.type', 'entity.name.class', 'support.type', 'support.class'], bronze),
    token(['variable', 'variable.other', 'meta.definition.variable'], text),
    token(['variable.parameter'], muted),
    token(['entity.name.tag'], maroon),
    token(['entity.other.attribute-name'], bronze),
    token(['keyword.operator', 'punctuation'], text),
    token(['markup.inserted'], green),
    token(['markup.deleted'], maroon),
    token(['invalid'], maroon, 'underline'),
  ],
};
