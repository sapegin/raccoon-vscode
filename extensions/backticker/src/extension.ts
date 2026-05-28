import {
  Position,
  Range,
  window,
  workspace,
  type ExtensionContext,
} from 'vscode';
import { findEnclosingQuotedString, isJsxAttributeQuote } from './backticker';

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'javascriptreact',
  'typescript',
  'typescriptreact',
]);

const JSX_LANGUAGES = new Set(['javascriptreact', 'typescriptreact']);

export function activate(context: ExtensionContext) {
  context.subscriptions.push(
    workspace.onDidChangeTextDocument(async (event) => {
      const { document, contentChanges } = event;

      if (!SUPPORTED_LANGUAGES.has(document.languageId)) {
        return;
      }

      if (contentChanges.length !== 1) {
        return;
      }

      const change = contentChanges[0];
      if (!change) {
        return;
      }

      // Only trigger when the user inserted a single `{` character
      if (change.text !== '{' || change.rangeLength !== 0) {
        return;
      }

      const insertPosition = change.range.start;
      const dollarIndex = insertPosition.character - 1;
      const braceIndex = insertPosition.character;
      if (dollarIndex < 0) {
        return;
      }

      const line = document.lineAt(insertPosition.line).text;
      if (line[dollarIndex] !== '$' || line[braceIndex] !== '{') {
        return;
      }

      const enclosing = findEnclosingQuotedString(line, dollarIndex);
      if (!enclosing) {
        return;
      }

      const editor = window.activeTextEditor;
      if (!editor || editor.document !== document) {
        return;
      }

      const lineNumber = insertPosition.line;
      const isJsxLanguage = JSX_LANGUAGES.has(document.languageId);
      const isJsxAttribute =
        isJsxLanguage && isJsxAttributeQuote(line, enclosing.start);

      const openRange = new Range(
        new Position(lineNumber, enclosing.start),
        new Position(lineNumber, enclosing.start + 1)
      );
      const closeRange = new Range(
        new Position(lineNumber, enclosing.end),
        new Position(lineNumber, enclosing.end + 1)
      );

      await editor.edit(
        (edit) => {
          if (isJsxAttribute) {
            edit.replace(openRange, '{`');
            edit.replace(closeRange, '`}');
          } else {
            edit.replace(openRange, '`');
            edit.replace(closeRange, '`');
          }
        },
        { undoStopBefore: false, undoStopAfter: false }
      );
    })
  );
}
