import { type TextDocument } from 'vscode';
import { BracketType } from '../types/BracketType';
import { type Message } from '../types/Message';
import { closingContextLine } from './closingContextLine';
import { emojis } from './emojis';
import { spacesBeforeLogMessage } from './spacesBeforeLogMessage';

export function detectAllLogs(
  document: TextDocument,
  logFunction: string
): Message[] {
  const documentNbrOfLines: number = document.lineCount;
  const logMessages: Message[] = [];
  for (let index = 0; index < documentNbrOfLines; index++) {
    const emojiConsoleLogMessage = new RegExp(
      logFunction.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`)
    );
    if (emojiConsoleLogMessage.test(document.lineAt(index).text)) {
      const logMessage: Message = {
        spaces: spacesBeforeLogMessage(document, index, index),
        lines: [],
      };
      const closedParenthesisLine = closingContextLine(
        document,
        index,
        BracketType.PARENTHESIS
      );
      let message = '';
      for (
        let lineIndex = index;
        lineIndex <= closedParenthesisLine;
        lineIndex++
      ) {
        message += document.lineAt(lineIndex).text;
        logMessage.lines.push(
          document.lineAt(lineIndex).rangeIncludingLineBreak
        );
      }
      if (new RegExp(emojis.join('|')).test(message)) {
        logMessages.push(logMessage);
      }
    }
  }
  return logMessages;
}
