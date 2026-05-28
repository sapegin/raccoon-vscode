import {
  Range,
  window,
  workspace,
  type ExtensionContext,
  type TextEditor,
  type TextEditorDecorationType,
} from 'vscode';
import { findHexColors } from './colors';

const decorationTypes = new Map<string, TextEditorDecorationType>();

function getDecorationType(color: string): TextEditorDecorationType {
  const existing = decorationTypes.get(color);
  if (existing) {
    return existing;
  }
  const created = window.createTextEditorDecorationType({
    borderStyle: 'solid',
    borderColor: color,
    borderWidth: '0 0 3px 0',
  });
  decorationTypes.set(color, created);
  return created;
}

function decorate(editor: TextEditor): void {
  const text = editor.document.getText();
  const matches = findHexColors(text);

  const rangesByColor = new Map<string, Range[]>();
  for (const { color, start, end } of matches) {
    const range = new Range(
      editor.document.positionAt(start),
      editor.document.positionAt(end)
    );
    const ranges = rangesByColor.get(color);
    if (ranges) {
      ranges.push(range);
    } else {
      rangesByColor.set(color, [range]);
    }
  }

  // Clear decorations for colors that no longer appear in the document
  for (const color of decorationTypes.keys()) {
    if (!rangesByColor.has(color)) {
      editor.setDecorations(getDecorationType(color), []);
    }
  }

  for (const [color, ranges] of rangesByColor) {
    editor.setDecorations(getDecorationType(color), ranges);
  }
}

export function activate(context: ExtensionContext) {
  if (window.activeTextEditor) {
    decorate(window.activeTextEditor);
  }

  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        decorate(editor);
      }
    }),

    workspace.onDidChangeTextDocument(({ document, contentChanges }) => {
      if (contentChanges.length === 0) {
        return;
      }
      const editor = window.activeTextEditor;
      if (editor?.document === document) {
        decorate(editor);
      }
    })
  );
}
