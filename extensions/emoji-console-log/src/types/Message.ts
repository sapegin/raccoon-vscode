import { Range } from 'vscode';

export interface Message {
  spaces: string;
  lines: Range[];
}
