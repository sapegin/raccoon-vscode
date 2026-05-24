import { describe, expect, test } from 'vitest';
import { type TextDocument } from 'vscode';
import {
  detectCommentStyle,
  isParagraphBreak,
  wrapBareBlockParagraph,
} from './document';
import { isCommentEnd, isCommentStart, wrapComment } from './grim-wrapper';

/**
 * Create a minimal mock TextDocument from an array of lines.
 */
function mockDocument(lines: readonly string[]): TextDocument {
  return {
    lineAt(line: number) {
      return { text: lines[line] };
    },
    lineCount: lines.length,
  } as unknown as TextDocument;
}

/**
 * Simulate the full paragraph range detection + wrapping pipeline.
 *
 * This mirrors the logic in `wrapText()` but operates on plain arrays so we
 * can test without a real VSCode editor.
 */
function simulateWrap(
  lines: readonly string[],
  cursorLine: number,
  maxLength = 80
) {
  const document = mockDocument(lines);
  const style = detectCommentStyle(document, cursorLine);

  // Walk up
  let startLine = cursorLine;
  while (true) {
    const lineText = lines[startLine]?.trim() ?? '';
    if (isCommentStart(lineText)) {
      break;
    }
    if (isParagraphBreak(lineText, style)) {
      startLine++;
      break;
    }
    if (startLine === 0) {
      break;
    }
    startLine--;
  }

  // Walk down
  let endLine = cursorLine;
  while (true) {
    const lineText = lines[endLine]?.trim() ?? '';
    if (isCommentEnd(lineText)) {
      break;
    }
    if (isParagraphBreak(lineText, style)) {
      endLine--;
      break;
    }
    if (endLine === lines.length - 1) {
      break;
    }
    endLine++;
  }

  const text = lines.slice(startLine, endLine + 1).join('\n');
  const rangeIncludesBlockOpen = isCommentStart(lines[startLine]?.trim() ?? '');
  const needsSyntheticMarkers =
    style === 'block-bare' && rangeIncludesBlockOpen === false;

  const wrapped = needsSyntheticMarkers
    ? wrapBareBlockParagraph(text, maxLength)
    : wrapComment(text, maxLength);

  return { style, startLine, endLine, text, wrapped };
}

describe(detectCommentStyle, () => {
  test('detects // comment', () => {
    const doc = mockDocument([
      'const x = 1;',
      '// This is a comment.',
      'const y = 2;',
    ]);
    expect(detectCommentStyle(doc, 1)).toBe('line');
  });

  test('detects # comment', () => {
    const doc = mockDocument(['# This is a comment.']);
    expect(detectCommentStyle(doc, 0)).toBe('line');
  });

  test('detects block-bare (/* without * prefix)', () => {
    const doc = mockDocument(['/*', '  Content without star prefix.', '*/']);
    expect(detectCommentStyle(doc, 0)).toBe('block-bare');
    expect(detectCommentStyle(doc, 1)).toBe('block-bare');
    expect(detectCommentStyle(doc, 2)).toBe('block-bare');
  });

  test('detects block-prefix (/** with * prefix)', () => {
    const doc = mockDocument(['/**', ' * Content with star prefix.', ' */']);
    expect(detectCommentStyle(doc, 0)).toBe('block-prefix');
    expect(detectCommentStyle(doc, 1)).toBe('block-prefix');
    expect(detectCommentStyle(doc, 2)).toBe('block-prefix');
  });

  test('detects plain text', () => {
    const doc = mockDocument(['Just some plain text.']);
    expect(detectCommentStyle(doc, 0)).toBe('plain');
  });

  test('detects plain when cursor is after a closed block comment', () => {
    const doc = mockDocument(['/*', '  comment', '*/', 'const x = 1;']);
    expect(detectCommentStyle(doc, 3)).toBe('plain');
  });

  test('detects block-bare for second paragraph inside /* */', () => {
    const doc = mockDocument([
      '/*',
      '  First paragraph.',
      '',
      '  Second paragraph.',
      '*/',
    ]);
    expect(detectCommentStyle(doc, 3)).toBe('block-bare');
  });

  test('detects block-prefix for second paragraph inside /** */', () => {
    const doc = mockDocument([
      '/**',
      ' * First paragraph.',
      ' *',
      ' * Second paragraph.',
      ' */',
    ]);
    expect(detectCommentStyle(doc, 3)).toBe('block-prefix');
  });
});

describe(isParagraphBreak, () => {
  test('empty line is a break for block-bare', () => {
    expect(isParagraphBreak('', 'block-bare')).toBe(true);
    expect(isParagraphBreak('  ', 'block-bare')).toBe(true);
  });

  test('non-empty line is not a break for block-bare', () => {
    expect(isParagraphBreak('  content', 'block-bare')).toBe(false);
  });

  test('empty line is a break for plain', () => {
    expect(isParagraphBreak('', 'plain')).toBe(true);
  });

  test('prefix-only line is a break for block-prefix', () => {
    expect(isParagraphBreak(' *', 'block-prefix')).toBe(true);
  });

  test('content line is not a break for block-prefix', () => {
    expect(isParagraphBreak(' * content', 'block-prefix')).toBe(false);
  });

  test('non-comment line is a break for line style', () => {
    expect(isParagraphBreak('const x = 1;', 'line')).toBe(true);
  });

  test('// with content is not a break for line style', () => {
    expect(isParagraphBreak('// content', 'line')).toBe(false);
  });

  test('empty // is a break for line style', () => {
    expect(isParagraphBreak('//', 'line')).toBe(true);
  });
});

describe(wrapBareBlockParagraph, () => {
  test('wraps text with 2-space indentation', () => {
    const text =
      '  Sorrow tapping over rapping borrow for the lost Lenore volume came morrow it. Only had gently each volume.';
    const result = wrapBareBlockParagraph(text, 80);
    const lines = result.split('\n');
    for (const line of lines) {
      expect(line).toMatch(/^\s{2}\S/);
    }
  });

  test('preserves closing marker when present', () => {
    const text = '  Short paragraph.\n*/';
    const result = wrapBareBlockParagraph(text, 80);
    expect(result).toContain('*/');
  });

  test('does not add closing marker when absent', () => {
    const text = '  Short paragraph.';
    const result = wrapBareBlockParagraph(text, 80);
    expect(result).not.toContain('*/');
  });
});

describe('simulateWrap: bare block comments (/* */)', () => {
  const lines = [
    '/*',
    '  Add additional folders where Tailwind should look for class names.',
    '  notation does not work here.',
    '*/',
  ];

  test('cursor on /* captures full comment', () => {
    const r = simulateWrap(lines, 0);
    expect(r.style).toBe('block-bare');
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(3);
  });

  test('cursor on content captures full comment', () => {
    const r = simulateWrap(lines, 1);
    expect(r.style).toBe('block-bare');
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(3);
  });

  test('cursor on */ captures full comment', () => {
    const r = simulateWrap(lines, 3);
    expect(r.style).toBe('block-bare');
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(3);
  });

  test('wrapping preserves /* and */ markers', () => {
    const r = simulateWrap(lines, 1);
    expect(r.wrapped).toMatch(/^\/\*/);
    expect(r.wrapped).toMatch(/\*\/$/);
  });

  test('content lines are indented with 2 spaces', () => {
    const r = simulateWrap(lines, 1);
    const contentLines = r.wrapped.split('\n').slice(1, -1);
    for (const line of contentLines) {
      expect(line).toMatch(/^\s{2}\S/);
    }
  });
});

describe('simulateWrap: bare block with two paragraphs', () => {
  const lines = [
    '/*',
    '  First paragraph.',
    '',
    '  Second paragraph that is long enough to need wrapping because it exceeds the maximum line length of eighty characters definitely.',
    '*/',
  ];

  test('cursor on first paragraph captures only first paragraph + /*', () => {
    const r = simulateWrap(lines, 1);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(1);
  });

  test('cursor on second paragraph uses synthetic markers', () => {
    const r = simulateWrap(lines, 3);
    expect(r.style).toBe('block-bare');
    expect(r.startLine).toBe(3);
    expect(r.endLine).toBe(4);
  });

  test('second paragraph gets 2-space indentation', () => {
    const r = simulateWrap(lines, 3);
    const contentLines = r.wrapped
      .split('\n')
      .filter((line) => line.trim() !== '*/');
    for (const line of contentLines) {
      expect(line).toMatch(/^\s{2}\S/);
    }
  });

  test('second paragraph preserves closing */', () => {
    const r = simulateWrap(lines, 3);
    expect(r.wrapped).toMatch(/\*\/$/);
  });
});

describe('simulateWrap: // comments', () => {
  test('captures only comment lines, not surrounding code', () => {
    const lines = [
      'const x = 1;',
      '// This is a comment.',
      '// Second line.',
      'const y = 2;',
    ];
    const r = simulateWrap(lines, 1);
    expect(r.style).toBe('line');
    expect(r.startLine).toBe(1);
    expect(r.endLine).toBe(2);
  });

  test('captures comment lines with empty lines around them', () => {
    const lines = [
      'const x = 1;',
      '',
      '// This is a comment.',
      '// Second line.',
      '',
      'const y = 2;',
    ];
    const r = simulateWrap(lines, 2);
    expect(r.startLine).toBe(2);
    expect(r.endLine).toBe(3);
  });

  test('wraps long // comment', () => {
    const lines = [
      '// Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino.',
      '// Second line.',
    ];
    const r = simulateWrap(lines, 0);
    expect(r.wrapped).toContain('//');
    expect(r.wrapped.split('\n').length).toBeGreaterThan(1);
  });

  test('respects paragraph break in // comments', () => {
    const lines = ['// First paragraph.', '//', '// Second paragraph.'];
    const r = simulateWrap(lines, 0);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(0);
  });
});

describe('simulateWrap: /** */ comments', () => {
  test('captures first paragraph only (up to * break)', () => {
    const lines = [
      '/**',
      ' * First paragraph.',
      ' *',
      ' * Second paragraph.',
      ' */',
    ];
    const r = simulateWrap(lines, 1);
    expect(r.style).toBe('block-prefix');
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(1);
  });

  test('wraps long /** comment', () => {
    const lines = [
      '/**',
      ' * Bicycle rights disrupt craft beer butcher bagel biodiesel vintage asymmetrical wet cappuccino underconsuption High Life.',
      ' */',
    ];
    const r = simulateWrap(lines, 1);
    expect(r.wrapped).toContain('/**');
    expect(r.wrapped).toContain(' * ');
  });
});

describe('simulateWrap: inline CSS comment', () => {
  test('captures full inline comment', () => {
    const lines = [
      '  /* there are no JS events on autofill,',
      '  so we have to simulate the change on the adjacent input label,',
      '  see the styling in the FormInput component */',
    ];
    const r = simulateWrap(lines, 1);
    expect(r.startLine).toBe(0);
    expect(r.endLine).toBe(2);
  });
});

describe('simulateWrap: single-line /* */ comment', () => {
  test('short comment is returned as-is', () => {
    const lines = ['/* short comment */'];
    const r = simulateWrap(lines, 0);
    expect(r.wrapped).toBe('/* short comment */');
  });
});
