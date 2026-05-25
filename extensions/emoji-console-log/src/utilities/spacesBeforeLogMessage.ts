import { type TextDocument } from 'vscode';

export function spacesBeforeLogMessage(
  document: TextDocument,
  selectedVariableLine: number,
  logMessageLine: number
): string {
  const selectedVariableTextLine = document.lineAt(selectedVariableLine);
  const spacesBeforeSelectedVariableLine = selectedVariableTextLine.text.slice(
    0,
    selectedVariableTextLine.firstNonWhitespaceCharacterIndex
  );
  if (logMessageLine < document.lineCount) {
    const logMessageTextLine = document.lineAt(logMessageLine);
    const spacesBeforeLogMessageLine = logMessageTextLine.text.slice(
      0,
      logMessageTextLine.firstNonWhitespaceCharacterIndex
    );
    return spacesBeforeSelectedVariableLine.length >
      spacesBeforeLogMessageLine.length
      ? spacesBeforeSelectedVariableLine
      : spacesBeforeLogMessageLine;
  }
  return spacesBeforeSelectedVariableLine;
}
