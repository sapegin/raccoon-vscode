import { describe, expect, test } from 'vitest';
import {
  getAvailableLength,
  getCommentPrefix,
  isComment,
  isCommentBreak,
  isCommentEnd,
  isCommentStart,
  isInsideMultilineComment,
  isListItemOrTag,
  normalizeCommentPrefix,
  splitIntoChunks,
  splitIntoLines,
  stripFormatting,
  wrapComment,
} from './grim-wrapper';

/** Removes leading and trailing line breaks */
const stripLineBreaks = (text: string) =>
  text.replace(/^\n+/, '').replace(/\n+$/, '');

describe(isCommentStart, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', false],
    ['  // No buy year wolf chambray kale chips.', false],
    ['\t// No buy year wolf chambray kale chips.', false],
    ['  /* No buy year wolf chambray kale chips. */', true],
    ['  /** No buy year wolf chambray kale chips. */', true],
    ['  {/* No buy year wolf chambray kale chips. */}', true],
    ['  # No buy year wolf chambray kale chips.', false],
    ['  <!-- No buy year wolf chambray kale chips.', true],
    ['No buy year wolf chambray kale chips.', false],
  ])('returns prefix: %s', (input, expected) => {
    const result = isCommentStart(input);
    expect(result).toBe(expected);
  });
});

describe(isCommentEnd, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', false],
    ['  // No buy year wolf chambray kale chips.', false],
    ['\t// No buy year wolf chambray kale chips.', false],
    ['  /* No buy year wolf chambray kale chips. */', true],
    ['  /** No buy year wolf chambray kale chips. */', true],
    ['  {/* No buy year wolf chambray kale chips. */}', true],
    ['  <!-- No buy year wolf chambray kale chips. -->', true],
    ['  # No buy year wolf chambray kale chips.', false],
    ['No buy year wolf chambray kale chips.', false],
  ])('returns prefix: %s', (input, expected) => {
    const result = isCommentEnd(input);
    expect(result).toBe(expected);
  });
});

describe(isCommentBreak, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', false],
    ['  // No buy year wolf chambray kale chips.', false],
    ['\t// No buy year wolf chambray kale chips.', false],
    ['  /* No buy year wolf chambray kale chips. */', false],
    ['  /** No buy year wolf chambray kale chips. */', false],
    ['  {/* No buy year wolf chambray kale chips. */}', false],
    ['  # No buy year wolf chambray kale chips.', false],
    ['  #', true],
    ['  //', true],
    ['  *', true],
    ['  ', true],
    ['', true],
    ['Any test that is not a comment', true],
  ])('returns prefix: %s', (input, expected) => {
    const result = isCommentBreak(input);
    expect(result).toBe(expected);
  });
});

describe(isComment, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', true],
    ['  // No buy year wolf chambray kale chips.', true],
    ['\t// No buy year wolf chambray kale chips.', true],
    ['  /* No buy year wolf chambray kale chips. */', true],
    ['  /** No buy year wolf chambray kale chips. */', true],
    ['  {/* No buy year wolf chambray kale chips. */}', true],
    ['  # No buy year wolf chambray kale chips.', true],
    ['  /* No buy year wolf chambray kale chips. */', true],
    ['  /** No buy year wolf chambray kale chips. */', true],
    ['  {/* No buy year wolf chambray kale chips. */}', true],
    ['  # No buy year wolf chambray kale chips.', true],
    ['  <!-- No buy year wolf chambray kale chips. -->', true],
    ['  #', true],
    ['  //', true],
    ['  *', true],
    ['  ', false],
    ['\t', false],
    ['', false],
    ['No buy year wolf chambray kale chips.', false],
  ])('returns prefix: %s', (input, expected) => {
    const result = isComment(input);
    expect(result).toBe(expected);
  });
});

describe(isInsideMultilineComment, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', true],
    ['  // No buy year wolf chambray kale chips.', true],
    ['\t// No buy year wolf chambray kale chips.', true],
    ['  /* No buy year wolf chambray kale chips. */', false],
    ['  /** No buy year wolf chambray kale chips. */', false],
    ['  {/* No buy year wolf chambray kale chips. */}', false],
    ['  # No buy year wolf chambray kale chips.', true],
    ['  /* No buy year wolf chambray kale chips. */', false],
    ['  /** No buy year wolf chambray kale chips. */', false],
    ['  {/* No buy year wolf chambray kale chips. */}', false],
    ['  # No buy year wolf chambray kale chips.', true],
    ['  <!-- No buy year wolf chambray kale chips. -->', false],
    ['  #', true],
    ['  //', true],
    ['  *', true],
    ['  ', false],
    ['\t', false],
    ['', false],
    ['No buy year wolf chambray kale chips.', false],
  ])('returns prefix: %s', (input, expected) => {
    const result = isInsideMultilineComment(input);
    expect(result).toBe(expected);
  });
});

describe(getCommentPrefix, () => {
  test.each([
    ['// No buy year wolf chambray kale chips.', '// '],
    ['  // No buy year wolf chambray kale chips.', '  // '],
    ['\t// No buy year wolf chambray kale chips.', '\t// '],
    ['  /* No buy year wolf chambray kale chips. */', '  /* '],
    ['  /** No buy year wolf chambray kale chips. */', '  /** '],
    ['  {/* No buy year wolf chambray kale chips. */}', '  {/* '],
    ['  {/** No buy year wolf chambray kale chips. */}', '  {/* '],
    ['  # No buy year wolf chambray kale chips.', '  # '],
    ['  <!-- No buy year wolf chambray kale chips. -->', '  <!-- '],
    ['No buy year wolf chambray kale chips.', ''],
    [
      `    /**
 * Adds necessary spacing on the bottom of the page for the mobile navigation
 * bar and floating banner to make the footer accessible
 */`,
      '    /**',
    ],
  ])('returns prefix: %s', (input, expected) => {
    const result = getCommentPrefix(input);
    expect(result).toBe(expected);
  });
});

describe(normalizeCommentPrefix, () => {
  test.each([
    ['// ', '// '],
    ['  // ', '  // '],
    ['\t// ', '\t// '],
    ['  /* ', '  '],
    ['  /** ', '   * '],
    ['  {/* ', '  '],
    ['  {/** ', '  '],
    ['  <!-- ', '  '],
    ['  # ', '  # '],
    ['', ''],
    ['  ', '  '],
    ['\t', '\t'],
    ['    /**', '     * '],
  ])('returns normalized prefix: %s', (input, expected) => {
    const result = normalizeCommentPrefix(input);
    expect(result).toBe(expected);
  });
});

describe(stripFormatting, () => {
  test.each([
    [
      '// No buy year wolf chambray kale chips.',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '  // No buy year wolf chambray kale chips.',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '//No buy year wolf chambray kale chips.',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      `  // Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
      // asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.`,
      [
        `Bicycle rights disrupt craft beer butcher bagel biodiesel vintage`,
        `asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.`,
      ],
    ],
    [
      '/* No buy year wolf chambray kale chips. */',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '  /* No buy year wolf chambray kale chips. */',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '/*No buy year wolf chambray kale chips.*/',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '<!-- No buy year wolf chambray kale chips. -->',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      `/*
     * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
     * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
     * kitsch.
     */`,
      [
        'Bicycle rights disrupt craft beer butcher bagel biodiesel vintage',
        'asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia',
        'kitsch.',
      ],
    ],
    [
      `* Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
     * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
     * kitsch.`,
      [
        'Bicycle rights disrupt craft beer butcher bagel biodiesel vintage',
        'asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia',
        'kitsch.',
      ],
    ],
    [
      '/** No buy year wolf chambray kale chips. */',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '  /** No buy year wolf chambray kale chips. */',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '/**No buy year wolf chambray kale chips.*/',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      `/**
     * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
     * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
     * kitsch.
     */`,
      [
        'Bicycle rights disrupt craft beer butcher bagel biodiesel vintage',
        'asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia',
        'kitsch.',
      ],
    ],
    [
      '{/* No buy year wolf chambray kale chips. */}',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '  {/* No buy year wolf chambray kale chips. */}',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      '{/*No buy year wolf chambray kale chips.*/}',
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      `{/*
     * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
     * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
     * kitsch.
     */}`,
      [
        'Bicycle rights disrupt craft beer butcher bagel biodiesel vintage',
        'asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia',
        'kitsch.',
      ],
    ],
    [
      `// We use two methods of detecting paragraphs:
// - Code comments:
//   - any lines between comment start/end (including)
//   - "empty" line (such as this or that)
// - Plain text:
//   - any lines between empty lines`,
      [
        `We use two methods of detecting paragraphs:`,
        `- Code comments:`,
        `  - any lines between comment start/end (including)`,
        `  - "empty" line (such as this or that)`,
        `- Plain text:`,
        `  - any lines between empty lines`,
      ],
    ],
    [
      `We use two methods of detecting paragraphs:
- Code comments:
  - any lines between comment start/end (including)
  - "empty" line (such as this or that)
- Plain text:
  - any lines between empty lines`,
      [
        `We use two methods of detecting paragraphs:`,
        `- Code comments:`,
        `  - any lines between comment start/end (including)`,
        `  - "empty" line (such as this or that)`,
        `- Plain text:`,
        `  - any lines between empty lines`,
      ],
    ],
  ])('returns normalized prefix: %s', (input, expected) => {
    const result = stripFormatting(input);
    expect(result).toStrictEqual(expected);
  });
});

describe(getAvailableLength, () => {
  test.each([
    ['// ', 80, 77],
    ['', 80, 80],
  ])('returns available length: %s', (prefix, maxLength, expected) => {
    const result = getAvailableLength(prefix, maxLength);
    expect(result).toBe(expected);
  });
});

describe(splitIntoLines, () => {
  test.each([
    ['Tacos al pastor', ['Tacos al pastor']],
    ['- Eins\n- Zwei\n- Polizei', ['- Eins', '- Zwei', '- Polizei']],
    [
      'Tacos al pastor\nTacos de kolbasa\n\nTacos de something else',
      ['Tacos al pastor', 'Tacos de kolbasa', 'Tacos de something else'],
    ],
  ])('returns an array of chunks: %s', (text, expected) => {
    const result = splitIntoLines(text);
    expect(result).toStrictEqual(expected);
  });
});

describe(isListItemOrTag, () => {
  test.each([
    ['Tacos al pastor', false],
    ['- Eins', true],
    ['-Eins', true],
    ['* Eins', true],
    ['*Eins', true],
    ['- [ ] Eins', true],
    ['- [ ]Eins', true],
    ['* [ ] Eins', true],
    ['* [ ]Eins', true],
    ['- [x] Eins', true],
    ['- [x]Eins', true],
    ['* [x] Eins', true],
    ['* [x]Eins', true],
    ['- [X] Eins', true],
    ['- [X]Eins', true],
    ['* [X] Eins', true],
    ['* [X]Eins', true],
    ['1. Eins', true],
    ['1.Eins', true],
    ['22. Eins', true],
    ['22.Eins', true],
    ['@param foo', true],
    ['TODO: foo', true],
  ])('returns true if list or JSDoc: %s', (text, expected) => {
    const result = isListItemOrTag(text);
    expect(result).toStrictEqual(expected);
  });
});

describe(splitIntoChunks, () => {
  test.each([
    [
      ['No buy year wolf chambray kale chips.'],
      ['No buy year wolf chambray kale chips.'],
    ],
    [
      ['No buy year wolf', 'chambray kale', 'chips.'],
      ['No buy year wolf\nchambray kale\nchips.'],
    ],
    [
      [
        'No buy year wolf chambray kale chips.',
        '- Eins',
        '- Zwei',
        '- Polizei',
      ],
      [
        'No buy year wolf chambray kale chips.',
        '- Eins',
        '- Zwei',
        '- Polizei',
      ],
    ],
    [['- Eins,', '  zwei, polizei'], ['- Eins,\n  zwei, polizei']],
    [['- Eins,', 'zwei, polizei'], ['- Eins,\nzwei, polizei']],
    [
      [
        'No buy year wolf chambray kale chips.',
        '@param foo Something',
        '@param bar Something else',
      ],
      [
        'No buy year wolf chambray kale chips.',
        '@param foo Something',
        '@param bar Something else',
      ],
    ],
    [
      [
        'TODO: No buy year wolf chambray kale chips.',
        'TODO: Something',
        'TODO: Something else',
      ],
      [
        'TODO: No buy year wolf chambray kale chips.',
        'TODO: Something',
        'TODO: Something else',
      ],
    ],
    [
      ['- Eins', '* Zwei'],
      ['- Eins', '* Zwei'],
    ],
    [
      ['-Eins', '*Zwei'],
      ['-Eins', '*Zwei'],
    ],
    [
      ['- [ ] Polizei', '- [x] Polizei', '* [ ] Polizei', '* [x] Polizei'],
      ['- [ ] Polizei', '- [x] Polizei', '* [ ] Polizei', '* [x] Polizei'],
    ],
    [
      [
        `We use two methods of detecting paragraphs:`,
        `- Code comments:`,
        `  - any lines between comment start/end (including)`,
        `  - "empty" line (such as this or that)`,
        `- Plain text:`,
        `  - any lines between empty lines`,
      ],
      [
        `We use two methods of detecting paragraphs:`,
        `- Code comments:`,
        `  - any lines between comment start/end (including)`,
        `  - "empty" line (such as this or that)`,
        `- Plain text:`,
        `  - any lines between empty lines`,
      ],
    ],
  ])('returns an array of chunks: %s', (lines, expected) => {
    const result = splitIntoChunks(lines);
    expect(result).toStrictEqual(expected);
  });
});

describe(wrapComment, () => {
  test.each([
    [
      // Returns a short text as is
      'No buy year wolf chambray kale chips.',
      'No buy year wolf chambray kale chips.',
    ],
    [
      // Returns a short comment as is
      '// No buy year wolf chambray kale chips.',
      '// No buy year wolf chambray kale chips.',
    ],
    [
      // Wraps basic // comment
      '// Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.',
      `
// Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
// asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
// kitsch.
`,
    ],
    [
      // Wraps basic text
      'Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.',
      `
Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
`,
    ],
    [
      // Wraps basic /* ... */ comment
      '/* Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch. */',
      `
/*
  Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
*/
`,
    ],
    [
      // Keeps * prefixes if they already exist
      `
 * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
 * wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
`,
      `
 * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
 * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
 * kitsch.
`,
    ],
    [
      `
  /* there are no JS events on autofill,
  so we have to simulate the change on the adjacent input label,
  see the styling in the FormInput component */
`,
      `
  /*
    there are no JS events on autofill, so we have to simulate the change on the
    adjacent input label, see the styling in the FormInput component
  */
`,
    ],
    [
      // Wraps short multiline comment
      `
  // Cursor commands.
  // Need to be copied, doesn't work with symlinks
`,
      `
  // Cursor commands. Need to be copied, doesn't work with symlinks
`,
    ],
    [
      // Correctly handles already wrapped /* ... */ comment
      `
/**
 * Adds necessary spacing on the bottom of the page for the mobile navigation
 * bar and floating banner to make the footer accessible
 */
`,
      `
/**
 * Adds necessary spacing on the bottom of the page for the mobile navigation
 * bar and floating banner to make the footer accessible
 */
`,
    ],
    [
      // Wraps a paragraph inside a /* ... */ or {/* ... */} comment (should
      // preserve the indentation)
      `   * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.`,
      `
   * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
   * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
   * kitsch.
`,
    ],
    [
      // Wraps basic /** ... */ comment
      '\t/** Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch. */',
      `
\t/**
\t * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
\t * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
\t * kitsch.
\t */
`,
    ],
    [
      // Wraps basic {/* ... */} comment
      '{/* Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch. */}',
      `
{/*
  Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
*/}
`,
    ],
    [
      // Wraps {/** ... */} comment
      '{/** Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch. */}',
      `
{/*
  Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
*/}
`,
    ],
    [
      // Wraps {/** ... */} comment with line prefixes
      `
{/**
* Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
* asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
* kitsch.
*/}
`,
      `
{/*
  Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
*/}
`,
    ],
    [
      // Wraps basic <!-- ... --> comment
      '    <!-- Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch. -->',
      `
    <!--
    Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
    asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
    kitsch.
    -->
`,
    ],
    [
      // Comments with multiple chunks: Markdown unordered list
      'No buy year wolf chambray kale chips.\n- Eins, zwei, polizei\n- Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.',
      `
No buy year wolf chambray kale chips.
- Eins, zwei, polizei
- Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
`,
    ],
    [
      // Comments with multiple chunks: Markdown ordered list
      'No buy year wolf chambray kale chips.\n1. Eins, zwei, polizei\n2. Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.',
      `
No buy year wolf chambray kale chips.
1. Eins, zwei, polizei
2. Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
   asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
   kitsch.
`,
    ],
    [
      // Nested lists
      `
// We use two methods of detecting paragraphs:
// - Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino.
//   - No buy year wolf chambray kale chips vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.
//   - Adds necessary spacing on the bottom of the page for the mobile navigation bar and floating banner to make the footer accessible.
// - Another list item. Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino.
`,
      `
// We use two methods of detecting paragraphs:
// - Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
//   asymmetrical wet cappuccino.
//   - No buy year wolf chambray kale chips vintage asymmetrical wet cappuccino
//     underconsuption High Life Prenzlauer Berg chia kitsch.
//   - Adds necessary spacing on the bottom of the page for the mobile
//     navigation bar and floating banner to make the footer accessible.
// - Another list item. Bicycle rights disrupt craft beer butcher bagel
//   biodiesel vintage asymmetrical wet cappuccino.
`,
    ],
    [
      // Nested list that doesn't need wrapping
      `
// We use two methods of detecting paragraphs:
// - Code comments:
//   - any lines between comment start/end (including)
//   - "empty" line (such as this or that)
// - Plain text:
//   - any lines between empty lines`,
      `// We use two methods of detecting paragraphs:
// - Code comments:
//   - any lines between comment start/end (including)
//   - "empty" line (such as this or that)
// - Plain text:
//   - any lines between empty lines
`,
    ],
    [
      // Comments with multiple chunks: JSDoc
      '\t/** Bicycle rights disrupt craft beer\nbutcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.\n\t * @param foo Short one\n\t * @param bar Artisan messenger bag Helvetica TikTok whatever Mauerpark fanny pack meh jean shorts freegan direct trade  aesthetic sustainable small batch. */',
      `
\t/**
\t * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
\t * asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
\t * kitsch.
\t * @param foo Short one
\t * @param bar Artisan messenger bag Helvetica TikTok whatever Mauerpark fanny
\t *     pack meh jean shorts freegan direct trade aesthetic sustainable small
\t *     batch.
\t */
`,
    ],
    [
      // Comments with TODO: items
      '\t// TODO: Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia kitsch.\n\t// TODO: Short one\n\t// TODO: Artisan messenger bag Helvetica TikTok whatever Mauerpark fanny pack meh jean shorts freegan direct trade  aesthetic sustainable small batch.',
      `
\t// TODO: Bicycle rights disrupt craft beer butcher bagel biodiesel vintage
\t// asymmetrical wet cappuccino underconsuption High Life Prenzlauer Berg chia
\t// kitsch.\n\t// TODO: Short one\n\t// TODO: Artisan messenger bag Helvetica TikTok whatever Mauerpark fanny pack
\t// meh jean shorts freegan direct trade aesthetic sustainable small batch.
`,
    ],
    [
      // Weirdly formatted comments and regressions
      `
/*
Bicycle rights disrupt craft beer butcher bagel
biodiesel vintage asymmetrical wet cappuccino
*/
`,
      `
/*
  Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical
  wet cappuccino
*/
`,
    ],
    [
      `
// See here: https://example.com/1234567890123456789012345678901234567890123456789012345678901234567890.html how to install things.`,
      `
// See here:
// https://example.com/1234567890123456789012345678901234567890123456789012345678901234567890.html
// how to install things.
`,
    ],
    [
      `
/*
uBlock origin error pages:
- moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html
*/
`,
      `
/*
  uBlock origin error pages:
  - moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html
*/
`,
    ],
    [
      `
/* moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html */
`,
      `
/* moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html */
`,
    ],
    [
      `
/* moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html */
`,
      `
/* moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html */
`,
    ],
    [
      `
/*
uBlock origin error pages:
- moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html
*/
`,
      `
/*
  uBlock origin error pages:
  - moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html
*/
`,
    ],
    [
      `
/*
uBlock origin error pages, such as moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html and many others keto literally Mauerpark kogi hella photo booth skateboard quinoa chillwave TikTok scenester meggings.
*/
`,
      `
/*
  uBlock origin error pages, such as
  moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90/document-blocked.html and
  many others keto literally Mauerpark kogi hella photo booth skateboard quinoa
  chillwave TikTok scenester meggings.
*/
`,
    ],
    [
      `
/*
uBlock origin error pages, such as moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html and many others keto literally Mauerpark kogi hella photo booth skateboard quinoa chillwave TikTok scenester meggings.
*/
`,
      `
/*
  uBlock origin error pages, such as
  moz-extension://a7bf810e-ecb9-4c69-8123-00aac8bb4f90-00aac8bb4f90/document-blocked.html
  and many others keto literally Mauerpark kogi hella photo booth skateboard
  quinoa chillwave TikTok scenester meggings.
*/
`,
    ],
  ])('wraps comment: %s', (input, expected) => {
    const result = wrapComment(stripLineBreaks(input));
    expect(result).toBe(stripLineBreaks(expected));
  });
});
