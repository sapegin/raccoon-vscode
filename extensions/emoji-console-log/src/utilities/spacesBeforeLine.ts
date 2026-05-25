import { TextDocument } from 'vscode';

export function spacesBeforeLine(
  document: TextDocument,
  lineNumber: number
): string {
  const textLine = document.lineAt(lineNumber);
  return textLine.text.slice(0, textLine.firstNonWhitespaceCharacterIndex);
}
