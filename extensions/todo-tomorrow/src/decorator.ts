import {
  window,
  Range,
  type TextEditorDecorationType,
  type TextDocumentContentChangeEvent,
} from 'vscode';
import { logMessage } from './debug';
import { type ExtensionProperties } from './types';

interface DecorationType {
  keywords: string[];
  decorationType: TextEditorDecorationType;
}

// By default look for C-style comments: // /* */ /** */
const DEFAULT_COMMENT_PATTERN = String.raw`(?://|/\*\*?| \*|^\*)\s*`;
// Shell-style comments: #
const HASH_COMMENT_PATTERN = String.raw`(?:#)\s*`;
const PERCENT_COMMENT_PATTERN = String.raw`(?:%)\s*`;
const COMMENT_PATTERNS: Record<string, string> = {
  // HTML should also support C-style comments for embedded JavaScript and CSS
  html: String.raw`(?:<!--|//|\*)\s*`,
  // For Markdown we only support todos at the beginning of a line or inside
  // an HTML comment
  markdown: String.raw`(?:^|\n|<!--\s*)`,
  // Lua: -- --[[
  // Only support single-line comments and the first line of multiline comments
  lua: String.raw`(?:--|--\[\[)\s*`,
  // SQL: --
  sql: String.raw`(?:--)\s*`,
  // PHP: / /* */ /** */ #
  php: String.raw`(?://|\*|#)\s*`,
  // Python: #
  // Only support single-line comments, no multiline (""" ... """)
  python: HASH_COMMENT_PATTERN,
  // Ruby: #
  // Only support single-line comments, no multiline (=begin ... =end)
  ruby: HASH_COMMENT_PATTERN,
  // Hash comments: #
  perl: HASH_COMMENT_PATTERN,
  r: HASH_COMMENT_PATTERN,
  shellscript: HASH_COMMENT_PATTERN,
  elixir: HASH_COMMENT_PATTERN,
  // Percent comments: %
  erlang: PERCENT_COMMENT_PATTERN,
  latex: PERCENT_COMMENT_PATTERN,
};

// Languages that allow stray keywords, meaning a keyword is standing on it’s
// own line
const ENABLE_STRAY_KEYWORDS = ['markdown'];

/**
 * Escapes special characters in a RegExp string.
 */
function escapeRegExp(string: string): string {
  return string.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

export class Decorator {
  private config: ExtensionProperties;
  /** Number of lines in the document during the last decorate() call */
  private lineCount = 0;
  /** Numbers of lines where decorations were applied */
  private decoratedLines = new Set<number>();
  /** Pattern to match all comments */
  private patterns: Record<string, string> = {};
  /** Decoration types for each style */
  private decorationTypes: DecorationType[];

  public constructor(config: ExtensionProperties) {
    this.config = config;
    this.decorationTypes = this.getDecorationTypes();
    this.patterns = {};
  }

  public decorate(): void {
    const textEditor = window.activeTextEditor;
    if (textEditor === undefined) {
      return;
    }

    const regExp = this.getRegExp({ global: true });
    if (regExp === undefined) {
      return;
    }

    this.lineCount = textEditor.document.lineCount;
    this.decoratedLines.clear();

    const text = textEditor.document.getText();
    const matches: Record<string, Range[]> = {};
    let match: RegExpExecArray | null;
    while ((match = regExp.exec(text))) {
      const captured = match[1];
      if (captured === undefined) {
        continue;
      }

      const keyword = captured
        .replace(/^@/, '')
        .replace(/:$/, '')
        .trim()
        .toUpperCase();
      logMessage('Match:', match, `[${keyword}]`);

      const startPos = textEditor.document.positionAt(
        match.index + (match[0].length - captured.length)
      );
      const endPos = textEditor.document.positionAt(
        match.index + match[0].length
      );
      const range = new Range(startPos, endPos);

      matches[keyword] ??= [];
      matches[keyword].push(range);

      this.decoratedLines.add(startPos.line);
    }

    for (const { keywords, decorationType } of this.decorationTypes) {
      const ranges = keywords.flatMap((x) => matches[x] ?? []);
      logMessage('Add decoration', decorationType, keywords, ranges);
      textEditor.setDecorations(decorationType, ranges);
    }
  }

  public decorateLines(
    contentChanges: readonly TextDocumentContentChangeEvent[]
  ) {
    const textEditor = window.activeTextEditor;
    if (textEditor === undefined) {
      return;
    }

    const regExp = this.getRegExp();

    const hasLineNumberChanged =
      this.lineCount !== textEditor.document.lineCount;
    const hasMultilineChanges =
      contentChanges.every(({ range }) => range.isSingleLine) === false;
    const changedLines = contentChanges.map(({ range }) => range.start.line);
    const hadDecoratorsOnChangedLines = changedLines.some((x) =>
      this.decoratedLines.has(x)
    );
    const shouldHaveDecoratorsOnChangedLines = changedLines.some((x) =>
      regExp?.test(textEditor.document.lineAt(x).text)
    );

    // Skip decorating for certain cases to improve performance
    if (
      hasLineNumberChanged === false &&
      hasMultilineChanges === false &&
      hadDecoratorsOnChangedLines === false &&
      shouldHaveDecoratorsOnChangedLines === false
    ) {
      logMessage('Skip decoration...');
      return;
    }

    this.decorate();
  }

  private getDecorationTypes() {
    return this.config.patterns.map((pattern) => {
      const decorationType = window.createTextEditorDecorationType(pattern);
      return {
        keywords: pattern.keywords.map((x) => x.toUpperCase()),
        decorationType,
      };
    });
  }

  private getRegExp({ global = false } = {}) {
    const languageId = window.activeTextEditor?.document.languageId;
    if (!languageId) {
      return undefined;
    }

    // Return a new RegExp every time to avoid issues with the state (`lastIndex`)
    return new RegExp(this.getPattern(languageId), global ? 'g' : '');
  }

  private getPattern(languageId: string) {
    logMessage('Language:', languageId);

    const pattern = this.patterns[languageId];
    if (pattern) {
      return pattern;
    }

    const languagePatterns =
      COMMENT_PATTERNS[languageId] ?? DEFAULT_COMMENT_PATTERN;
    const enableStrayKeywords = ENABLE_STRAY_KEYWORDS.includes(languageId);
    const keywordsPattern = this.config.patterns
      .flatMap(({ keywords }) =>
        keywords.map((keyword) => escapeRegExp(keyword))
      )
      .join('|');

    this.patterns[languageId] =
      `${languagePatterns}((?:@(?:${keywordsPattern}))|(?:(?:${keywordsPattern.toUpperCase()})${enableStrayKeywords ? String.raw`(?:[:]|\n|$)` : ':'}))`;

    logMessage('RegExp:', this.patterns[languageId]);

    return this.patterns[languageId];
  }
}
