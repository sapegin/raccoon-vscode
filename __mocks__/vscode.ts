// Mock for the vscode module used in tests
export class Position {
  public readonly line: number;
  public readonly character: number;
  public constructor(line: number, character: number) {
    this.line = line;
    this.character = character;
  }
}

export class Range {
  public readonly start: Position;
  public readonly end: Position;
  public constructor(start: Position, end: Position) {
    this.start = start;
    this.end = end;
  }
}

export const window = {
  createOutputChannel() {
    return {
      appendLine() {
        // noop in tests
      },
    };
  },
};
