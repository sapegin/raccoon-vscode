export type QuoteChar = "'" | '"';

export interface EnclosingString {
  /** Index of the opening quote character */
  start: number;
  /** Index of the closing quote character */
  end: number;
  /** Quote character */
  quote: QuoteChar;
}

/**
 * Finds the single- or double-quoted string that encloses the given position on
 * a single line of source code. Returns null if the position is not inside such
 * a string (for example, inside a template literal, a `//` line comment, or
 * plain code), or if no matching closing quote exists on the same line.
 */
export function findEnclosingQuotedString(
  line: string,
  position: number
): EnclosingString | null {
  let openQuote: QuoteChar | null = null;
  let startIndex = -1;
  let isInBacktick = false;
  let isStartEscaped = false;

  for (let i = 0; i < position; i++) {
    const character = line[i];
    if (isStartEscaped) {
      isStartEscaped = false;
      continue;
    }
    if (character === '\\') {
      isStartEscaped = true;
      continue;
    }
    if (
      openQuote === null &&
      !isInBacktick &&
      character === '/' &&
      line[i + 1] === '/'
    ) {
      // Rest of the line is a line comment, position is inside it
      return null;
    }
    if (isInBacktick) {
      if (character === '`') {
        isInBacktick = false;
      }
      continue;
    }
    if (openQuote !== null) {
      if (character === openQuote) {
        openQuote = null;
        startIndex = -1;
      }
      continue;
    }
    if (character === '`') {
      isInBacktick = true;
      continue;
    }
    if (character === '"' || character === "'") {
      openQuote = character;
      startIndex = i;
    }
  }

  if (openQuote === null || startIndex < 0) {
    return null;
  }

  // Find the matching closing quote after the position
  let endIndex = -1;
  let isEndEscaped = false;
  for (let i = position; i < line.length; i++) {
    const character = line[i];
    if (isEndEscaped) {
      isEndEscaped = false;
      continue;
    }
    if (character === '\\') {
      isEndEscaped = true;
      continue;
    }
    if (character === openQuote) {
      endIndex = i;
      break;
    }
  }

  if (endIndex < 0) {
    return null;
  }

  return { start: startIndex, end: endIndex, quote: openQuote };
}

/**
 * Returns true if the quote at `openIndex` looks like the opening quote of a
 * JSX attribute value (i.e., immediately preceded by `=`).
 */
export function isJsxAttributeQuote(line: string, openIndex: number): boolean {
  return openIndex > 0 && line[openIndex - 1] === '=';
}
