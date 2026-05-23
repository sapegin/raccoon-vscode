import { Position, Range, type TextDocument, type TextEditor } from 'vscode';
import { logMessage } from './debug';
import {
  isCommentBreak,
  isCommentEnd,
  isCommentStart,
  wrapComment,
} from './grim-wrapper';
import { type ExtensionProperties } from './types';

const PLAIN_TEXT_LANGUAGES = ['markdown', 'plaintext'];

/**
 * Comment style detected by walking to the comment boundaries.
 *
 * - `block-prefix`: `/** ... * /` with `*` prefix on each line
 * - `block-bare`: `/* ... * /` without `*` prefix on content lines
 * - `line`: `//` or `#` single-line comment prefix
 * - `plain`: plain text or Markdown (no comment markers)
 */
export type CommentStyle = 'block-prefix' | 'block-bare' | 'line' | 'plain';

/**
 * Single-line comment prefixes (e.g. `//`, `#`).
 */
const LINE_PREFIX_PATTERN = /^\s*(?:\/\/|#)\s/;

/**
 * Multiline comment opening markers (e.g. `/*`, `/**`, `{/*`, `<!--`).
 */
const BLOCK_OPEN_PATTERN = /^\s*\/\*\*?\s*$/;

/**
 * Lines inside a `/** ... * /` comment that carry a `*` prefix.
 */
const STAR_PREFIX_PATTERN = /^\s*\*/;

/**
 * Block comment closing marker on its own line.
 */
const BLOCK_CLOSE_PATTERN = /^\s*\*\/\s*$/;

/**
 * Detect the comment style by walking upward from the cursor line to find the
 * nearest comment opening, then checking whether the body uses `*` prefixes.
 *
 * This intentionally avoids the grim-wrapper helpers so the logic is easy to
 * follow and debug locally. We may even merge grim-wrapper into this repository
 * to make it easier to iterate.
 */
export function detectCommentStyle(
  document: TextDocument,
  cursorLine: number
): CommentStyle {
  const cursorText = document.lineAt(cursorLine).text;

  // Check for single-line comment prefix on the cursor line
  if (LINE_PREFIX_PATTERN.test(cursorText)) {
    return 'line';
  }

  // Walk upward looking for a block comment opening (`/*` or `/**`)
  for (let line = cursorLine; line >= 0; line--) {
    const text = document.lineAt(line).text.trimEnd();

    // Found a block comment opening
    if (BLOCK_OPEN_PATTERN.test(text)) {
      // Look at the first content line after the opening to decide the style
      const nextContentLine = line + 1;
      if (nextContentLine < document.lineCount) {
        const nextText = document.lineAt(nextContentLine).text;
        if (STAR_PREFIX_PATTERN.test(nextText)) {
          return 'block-prefix';
        }
      }
      return 'block-bare';
    }

    // If we hit a closing marker on a line above the cursor, we've walked
    // past a complete comment block — the cursor is outside any block comment
    if (line < cursorLine && BLOCK_CLOSE_PATTERN.test(text)) {
      return 'plain';
    }

    // If we hit a line that looks like a `*` prefix, we're inside a `/**`
    // comment — keep walking up to find the opening
    if (STAR_PREFIX_PATTERN.test(text)) {
      continue;
    }

    // If we hit a line-comment prefix while walking up, the cursor is inside
    // a line-comment block
    if (LINE_PREFIX_PATTERN.test(text)) {
      return 'line';
    }
  }

  return 'plain';
}

/**
 * Determine whether a line is a paragraph break for the given comment style.
 */
export function isParagraphBreak(lineText: string, style: CommentStyle) {
  const trimmed = lineText.trim();

  if (style === 'block-prefix' || style === 'line') {
    // In prefixed comments (`/** */` or `//`), a paragraph break is a line
    // that has only the prefix with no content (e.g. ` *`, `//`) or a line
    // that isn't a comment at all (e.g. code)
    return isCommentBreak(trimmed);
  }

  // In `/* */` bare comments and plain text, an empty line is a paragraph
  // break
  return trimmed === '';
}

/**
 * Return the range for the comment block under cursor.
 */
function getCommentBlockRange(
  { document, selection }: TextEditor,
  style: CommentStyle
) {
  logMessage(`🐿️🍑 INIT ${selection.start.line}, ${selection.end.line}`);

  // Walk up
  let startLine = Math.min(selection.start.line, selection.end.line);
  logMessage(`🐿️ UP ${startLine}`);

  while (true) {
    const lineText = document.lineAt(startLine).text.trim();
    logMessage(`🐿️ UP line: [${lineText}]`);
    if (isCommentStart(lineText)) {
      // We found the first line of the comment
      logMessage('🐿️ UP start');
      break;
    }
    if (isParagraphBreak(document.lineAt(startLine).text, style)) {
      // We found paragraph break, go one step back, as we don't want to
      // include the "empty" line
      logMessage('🐿️ UP step back (paragraph break)');
      startLine++;
      break;
    }
    if (startLine === 0) {
      logMessage('🐿️ UP exit');
      // Exit loop to keep `startLine` at the first line of the document
      break;
    }
    logMessage('🐿️ UP --');
    startLine--;
  }

  // Walk down
  let endLine = Math.max(selection.start.line, selection.end.line);
  logMessage(`🍑 DOWN ${endLine}`);
  while (true) {
    const lineText = document.lineAt(endLine).text.trim();
    logMessage(`🍑 DOWN line: [${lineText}]`);
    if (isCommentEnd(lineText)) {
      // We found the last line of the comment
      break;
    }
    if (isParagraphBreak(document.lineAt(endLine).text, style)) {
      // We found paragraph break, go one step back, as we don't want to
      // include the "empty" line
      logMessage('🍑 DOWN step back (paragraph break)');
      endLine--;
      break;
    }
    if (endLine === document.lineCount - 1) {
      logMessage('🍑 DOWN exit');
      // Exit loop to keep `endLine` at the last line of the document
      break;
    }
    logMessage('🍑 DOWN ++');
    endLine++;
  }

  logMessage(`Comment block range lines: ${startLine}–${endLine}`);

  return new Range(
    new Position(startLine, 0),
    new Position(endLine, document.lineAt(endLine).text.length)
  );
}

/**
 * For paragraphs inside a bare block comment that don't include the opening
 * marker (i.e. the cursor was on a paragraph other than the first), we wrap
 * the text with synthetic markers so `wrapComment` applies the correct
 * indentation, then strip the markers from the result.
 */
export function wrapBareBlockParagraph(text: string, maxLength: number) {
  const hasClosingMarker = isCommentEnd(text.split('\n').at(-1)?.trim() ?? '');

  // Add synthetic opening, and a synthetic closing only when the original text
  // doesn't already end with one
  const syntheticComment = hasClosingMarker ? `/*\n${text}` : `/*\n${text}\n*/`;

  const wrapped = wrapComment(syntheticComment, maxLength);
  const lines = wrapped.split('\n');

  // Remove the synthetic opening `/*` line
  if (lines[0].trim() === '/*') {
    lines.shift();
  }

  // Remove the synthetic closing only when we added one
  if (hasClosingMarker === false && lines.at(-1)?.trim() === '*/') {
    lines.pop();
  }

  return lines.join('\n');
}

/**
 * Wraps the comment block under the cursor
 */
export function wrapText(editor: TextEditor, config: ExtensionProperties) {
  const languageId = editor.document.languageId;
  const cursorLine = editor.selection.start.line;

  const style = PLAIN_TEXT_LANGUAGES.includes(languageId)
    ? 'plain'
    : detectCommentStyle(editor.document, cursorLine);

  logMessage(`Detected comment style: ${style}`);

  const range = getCommentBlockRange(editor, style);

  const text = editor.document.getText(range);
  logMessage(`Comment block to wrap:\n${text}`);

  // When the paragraph range doesn't include the `/*` opening (second or later
  // paragraph in a bare block comment), wrap with synthetic markers so
  // `wrapComment` produces the correct indentation
  const rangeIncludesBlockOpen = isCommentStart(
    editor.document.lineAt(range.start.line).text.trim()
  );
  const needsSyntheticMarkers =
    style === 'block-bare' && rangeIncludesBlockOpen === false;

  const textWrapped = needsSyntheticMarkers
    ? wrapBareBlockParagraph(text, config.maxLength)
    : wrapComment(text, config.maxLength);

  logMessage(`Wrapped comment block:\n${textWrapped}`);

  if (text === textWrapped) {
    // Skip document update if there was no changes to the text
    return;
  }

  editor.edit((editBuilder) => {
    editBuilder.replace(range, textWrapped);
  });
}
