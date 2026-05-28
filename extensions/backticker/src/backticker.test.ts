import { describe, expect, test } from 'vitest';
import { findEnclosingQuotedString, isJsxAttributeQuote } from './backticker';

describe(findEnclosingQuotedString, () => {
  test('detects double-quoted string enclosing the dollar sign', () => {
    const line = 'const x = "hello $";';
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toStrictEqual({
      start: 10,
      end: 18,
      quote: '"',
    });
  });

  test('detects single-quoted string enclosing the dollar sign', () => {
    const line = "const x = 'hello $';";
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toStrictEqual({
      start: 10,
      end: 18,
      quote: "'",
    });
  });

  test('detects single-quoted string with nested double quotes', () => {
    const line = `const x = 'he said "hi" and $';`;
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toStrictEqual({
      start: 10,
      end: line.indexOf("'", 11),
      quote: "'",
    });
  });

  test('detects double-quoted string with nested single quotes', () => {
    const line = `const x = "don't stop $";`;
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toStrictEqual({
      start: 10,
      end: line.indexOf('"', 11),
      quote: '"',
    });
  });

  test('handles escaped quotes inside the string', () => {
    const line = `const x = 'don\\'t stop $';`;
    const dollar = line.indexOf('$');
    const result = findEnclosingQuotedString(line, dollar);
    expect(result?.start).toBe(10);
    expect(result?.quote).toBe("'");
  });

  test('handles escaped backslash before quote', () => {
    const line = `const x = "a\\\\" + "b $"`;
    const dollar = line.indexOf('$');
    const result = findEnclosingQuotedString(line, dollar);
    expect(result?.quote).toBe('"');
    expect(line[result?.start ?? -1]).toBe('"');
  });

  test('returns null inside a template literal', () => {
    const line = 'const x = `hello $`;';
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toBeNull();
  });

  test('returns null when there is no enclosing string', () => {
    const line = 'const x = $;';
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toBeNull();
  });

  test('returns null inside a line comment', () => {
    const line = 'const x = 1; // "hello $"';
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toBeNull();
  });

  test('returns null when the string has no closing quote on the line', () => {
    const line = 'const x = "hello $';
    const dollar = line.indexOf('$');
    expect(findEnclosingQuotedString(line, dollar)).toBeNull();
  });

  test('detects JSX attribute value string', () => {
    const line = `<div className="container $"></div>`;
    const dollar = line.indexOf('$');
    const result = findEnclosingQuotedString(line, dollar);
    expect(result?.start).toBe(line.indexOf('"'));
    expect(result?.quote).toBe('"');
  });

  test('detects single-quoted JSX attribute value', () => {
    const line = `<div className='container $'></div>`;
    const dollar = line.indexOf('$');
    const result = findEnclosingQuotedString(line, dollar);
    expect(result?.quote).toBe("'");
  });

  test('picks the innermost (last open) string when several strings precede', () => {
    const line = `const x = "a" + "b $";`;
    const dollar = line.indexOf('$');
    const result = findEnclosingQuotedString(line, dollar);
    expect(result?.start).toBe(line.indexOf('"', 14));
    expect(result?.quote).toBe('"');
  });
});

describe(isJsxAttributeQuote, () => {
  test('returns true when the quote is preceded by `=`', () => {
    const line = `<div className="container">`;
    expect(isJsxAttributeQuote(line, line.indexOf('"'))).toBe(true);
  });

  test('returns false when the quote is preceded by something else', () => {
    const line = `const x = "container";`;
    expect(isJsxAttributeQuote(line, line.indexOf('"'))).toBe(false);
  });

  test('returns false when the quote is at the start of the line', () => {
    expect(isJsxAttributeQuote('"hello"', 0)).toBe(false);
  });
});
