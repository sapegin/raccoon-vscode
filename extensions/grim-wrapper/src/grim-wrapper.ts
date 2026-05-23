// TODO: Maybe: Normalize list markers to `-` similar to Prettier
// TODO: Two spaces at the end of a line preserves the line break after it. This
// comes from Markdown should work for any content.

/**
 * Escapes special characters in a string to be used safely in a regular
 * expression.
 */
export function escapeRegExp(string: string): string {
  return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

/**
 * Transforms an array of strings to a regular expression choices.
 */
export function regExpChoices(choices: string[]): string {
  return choices.map((x) => escapeRegExp(x)).join('|');
}

// JSDoc tags are indented to a fixed size:
// https://google.github.io/styleguide/jsguide.html#jsdoc-line-wrapping
const JSDOC_INDENT = 4;

// Prefixes that start multiline comments: /**, /*, {/*
const multilinePrefixes = ['/**', '/*', '{/**', '{/*', '<!--'];

// Prefixes of lines inside a multiline comment: /**, /*, {/*
const multilineInsidePrefixes = ['*', '//', '#'];

const allPrefixes = [...multilinePrefixes, ...multilineInsidePrefixes];

// Suffixes that end multiline comments: /**, /*, {/*
const multilineSuffixes = ['*/', '*/}', '-->'];

// Comment prefixes: //, #, *, /**, /*, {/*
const prefixRegExp = new RegExp(
  String.raw`^\s*(?:${regExpChoices(allPrefixes)}) ?`
);

// Multiline comment prefix
const multilinePrefixRegExp = new RegExp(
  String.raw`^\s*(?:${regExpChoices(multilinePrefixes)}) ?`
);

// Multiline inside comment prefix
const multilineInsidePrefixRegExp = new RegExp(
  String.raw`^\s*(?:${regExpChoices(multilineInsidePrefixes)}) ?`
);

// Comment suffix (can be only on multiline comments)
const suffixRegExp = new RegExp(
  String.raw`(?:${regExpChoices(multilineSuffixes)})\s*$`
);

// List item markers: -, *, - [ ], - [x], 1., etc.
const listItemRegExp = /^\s*([-*]|\d+\.)(\s+\[[ xX]\])?\s*/;

// JSDoc tag: @param, @returns
const jsDocRegExp = /^\s*@\w+\s*/;

// Comment tag: TODO:, HACK:
const tagRegExp = /^\s*[A-Z]+:\s*/;

/**
 * Checks whether a given line is the beginning of a multiline comment.
 *
 * Examples:
 *
 * - `/* foo` → true
 * - ` * foo` → false
 * - `// foo` → false
 */
export function isCommentStart(text: string) {
  return multilinePrefixRegExp.test(text);
}

/**
 * Checks whether a given line is the end of a multiline comment.
 *
 * Examples:
 * `foo *_/` → true (ignore _)
 * ` * foo` → false
 * `// foo` → false
 */
export function isCommentEnd(text: string) {
  return suffixRegExp.test(text);
}

/**
 * Checks whether a given line is a line inside a comment.
 *
 * Examples:
 *
 * - `/* foo` → true
 * - `foo *_/` → true (ignore _)
 * - ` * foo` → true
 * - `// foo` → true
 * - ` *` → true
 * - `//` → true
 * - `alert()` → false
 * - `` → false
 */
export function isComment(text: string) {
  return prefixRegExp.test(text);
}

/**
 * Checks whether a given line is a line inside a multiline comment but not
 * comment beginning.
 *
 * Examples:
 *
 * - `/* foo` → false
 * - `foo *_/` → false (ignore _)
 * - ` * foo` → true
 * - `// foo` → true
 * - ` *` → true
 * - `//` → true
 * - `alert()` → false
 * - `` → false
 */
export function isInsideMultilineComment(text: string) {
  return multilineInsidePrefixRegExp.test(text);
}

/**
 * Checks whether a given line is a paragraph break in a multiline comment.
 *
 * Examples:
 *
 * - `/* foo` → false
 * - `foo *_/` → false (ignore _)
 * - ` * foo` → false
 * - `// foo` → false
 * - ` *` → true
 * - `//` → true
 * - `` → true
 * - `Any test that's not a comment` → true
 */
export function isCommentBreak(text: string) {
  // If it's a prefixed comment the break is any line with a prefix but no context,
  // otherwise the break is any line
  return isComment(text) ? multilineInsidePrefixes.includes(text.trim()) : true;
}

/**
 * Returns first line comment prefix.
 *
 * Examples:
 * - `  // Example` → `  //`
 */
export function getCommentPrefix(text: string) {
  const match = text.match(prefixRegExp);
  // Return the prefix but handle special cases:
  // - Remove the second * on JSX prefix: {/**
  return match ? match[0].replace('{/**', '{/*') : '';
}

/**
 * Returns last line comment prefix.
 *
 * Examples:
 *
 * - ` // Example` → ``
 * - ` /* Example *_/` → `*_/` (ignore _)
 */
export function getCommentSuffix(text: string) {
  const match = text.match(suffixRegExp);
  return match ? match[0] : '';
}

/**
 * Returns a prefix that should be used to prefix each line of comments.
 *
 * Examples:
 *
 * - `//` → `// `
 * - `#` → `# `
 * - `/*` → ` ` (two spaces)
 * - `/**` → `*`
 */
export function normalizeCommentPrefix(prefix: string) {
  // If there's only whitespace (for example, in Markdown or plain text), return
  // the prefix as is (we need to keep this whitespace for proper indentation)
  if (prefix.trim() === '') {
    return prefix;
  }

  const trimmedPrefix = prefix.trim();
  const leadingWhitespace = prefix.match(/^\s*/)?.[0] ?? '';

  // Check if it's a /** comment (not JSX) - should use * prefix
  if (trimmedPrefix === '/**') {
    return leadingWhitespace + ' * ';
  }

  // For /* comments and JSX comments ({/* or {/**), use just the leading
  // whitespace
  if (trimmedPrefix.startsWith('/*') || trimmedPrefix.startsWith('{/*')) {
    return leadingWhitespace;
  }

  const normalizedPrefix = prefix
    // Remove HTML opening marker (<!--)
    .replace(/<!--[ \t]*\s*/, '');

  // If we end up with an empty string or just whitespace (for HTML comments),
  // return just the leading whitespace
  if (normalizedPrefix.trim() === '') {
    return leadingWhitespace;
  }

  // Ensure there's one space at the end
  return normalizedPrefix.replace(/\s*$/, ' ');
}

/**
 * Returns comment as an array of lines of text: strips all comment markers and
 * squashes multiple line breaks into one. Multiple paragraphs are treated as a
 * single paragraph.
 */
export function stripFormatting(text: string) {
  const lines = splitIntoLines(text);

  return (
    lines
      // Remove suffixes (*/)
      .map((line) => line.replace(suffixRegExp, ''))
      // Remove prefixes (/*, //)
      .map((line) => line.replace(prefixRegExp, ''))
      // Remove trailing whitespace
      .map((line) => line.trimEnd())
      // Filter out empty lines
      .filter((line) => line.trim() !== '')
  );
}

/**
 * Returns the number of available characters inside the comment.
 */
export function getAvailableLength(prefix: string, maxLength: number) {
  return maxLength - prefix.length;
}

/**
 * Splits the text into an array of lines. Ignores empty lines.
 */
export function splitIntoLines(text: string) {
  return text.split(/(?:\r?\n)+/);
}

/**
 * Checks whether a given line starts with a list marker or JSDoc tag.
 */
export function isListItemOrTag(text: string) {
  return (
    listItemRegExp.test(text) || jsDocRegExp.test(text) || tagRegExp.test(text)
  );
}

/**
 * Splits the text into chunks. A chunk could be:
 *
 * - A block of text
 * - A list item (starts with `-` or `*`)
 * - A checklist item (starts with `- [ ]` or `* [ ]` or `- [x]` or `* [x]` )
 * - A JSDoc item (starts with @tagname)
 *
 * We assume that text blocks could only be placed before list items or JSDocs
 * tags.
 */
export function splitIntoChunks(lines: string[]): string[] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];

  for (const line of lines) {
    // A list item marker or JSDoc tag starts a new chunk
    if (isListItemOrTag(line) && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
    }
    currentChunk.push(line);
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks.map((chunk) => chunk.join('\n'));
}

/**
 * Wraps a single text block.
 */
export function wrapTextBlock(text: string, maxLength: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const isFirstWord = currentLine === '';
    const nextCurrentLine = `${currentLine}${isFirstWord ? '' : ' '}${word}`;
    if (nextCurrentLine.length > maxLength) {
      if (currentLine) {
        lines.push(currentLine);
      }
      currentLine = word;
    } else {
      currentLine = nextCurrentLine;
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  if (lines.length === 1 && lines[0].length > maxLength) {
    return [text];
  }

  return lines;
}

/**
 * Wraps a single list item or JDoc tag.
 */
export function wrapListItem(chunk: string, maxLength: number) {
  const match = chunk.match(listItemRegExp) ?? chunk.match(jsDocRegExp);
  const prefix = Array.isArray(match) ? match[0] : '';
  const prefixLength = prefix.length;
  const indentLength = jsDocRegExp.test(chunk) ? JSDOC_INDENT : prefix.length;

  // Wrap lines by available length minus indentation, pad the beginning of the
  // first line with @ character to accommodate the difference between the size
  // of indentation and the prefix
  const cleanChunk =
    '@'.repeat(prefixLength - indentLength) + chunk.replace(prefix, '');
  const lines = wrapTextBlock(cleanChunk, maxLength - indentLength);

  if (lines.length === 1 && lines[0] === cleanChunk) {
    return [chunk];
  }

  // Return the prefix and indent following lines
  const formattedLines = lines.map((line, index) =>
    index === 0
      ? `${prefix}${line.replaceAll(/^@+/g, '')}`
      : `${' '.repeat(indentLength)}${line}`
  );

  return formattedLines;
}

/**
 * Wrap a single paragraph in a code comment, Markdown, or plain text.
 */
export function wrapComment(comment: string, maxLength = 80) {
  const originalLineCount = splitIntoLines(comment).length;

  if (originalLineCount === 1 && comment.length <= maxLength) {
    // The whole comment is short enough, no need to do anything
    return comment;
  }

  const chunks = splitIntoChunks(stripFormatting(comment));

  const firstLinePrefix = getCommentPrefix(comment);
  const normalizedPrefix = normalizeCommentPrefix(firstLinePrefix);

  // For /* and {/* comments (but not /**), add two spaces for content
  // indentation
  const cleanFirstLinePrefix = firstLinePrefix.trim();
  const needsExtraIndent =
    (cleanFirstLinePrefix.startsWith('/*') && cleanFirstLinePrefix !== '/**') ||
    cleanFirstLinePrefix.startsWith('{/*');
  const contentPrefix = needsExtraIndent
    ? normalizedPrefix + '  '
    : normalizedPrefix;

  const availableMaxLength = getAvailableLength(contentPrefix, maxLength);

  const lines = [];
  for (const chunk of chunks) {
    const wrappedLines = isListItemOrTag(chunk)
      ? wrapListItem(chunk, availableMaxLength)
      : wrapTextBlock(chunk, availableMaxLength);

    lines.push(...wrappedLines);
  }

  const isMultilineComment = multilinePrefixes.includes(cleanFirstLinePrefix);
  const lastLineSuffix = getCommentSuffix(comment);
  const isSingleLineMultilineComment =
    originalLineCount === 1 &&
    isMultilineComment &&
    multilineSuffixes.includes(lastLineSuffix);

  // If it's not a multiline comment and no wrapping occurred, return unchanged
  // Also, if it's a single-line /* */ comment that can't be wrapped, keep it
  // as-is
  if (
    (isMultilineComment === false || isSingleLineMultilineComment) &&
    lines.every((line, index) => line === chunks[index])
  ) {
    return comment;
  }

  const prefixedLines = lines.map((line) => `${contentPrefix}${line}`);

  // Restore opening /*, /**, <!--, etc.
  if (isMultilineComment) {
    prefixedLines.unshift(firstLinePrefix.trimEnd());
  }

  // Restore closing */, -->, etc.
  if (multilineSuffixes.includes(lastLineSuffix)) {
    // Extract the leading whitespace from the normalized prefix
    const indentation = normalizedPrefix.match(/^\s*/)?.[0] ?? '';
    prefixedLines.push(`${indentation}${lastLineSuffix}`);
  }

  return prefixedLines.join('\n');
}
