import { describe, expect, test } from 'vitest';
import { findHexColors } from './colors';

describe(findHexColors, () => {
  test('matches 3-digit hex colors', () => {
    expect(findHexColors('color: #f00;')).toStrictEqual([
      { color: '#f00', start: 7, end: 11 },
    ]);
  });

  test('matches 4-digit hex colors with alpha', () => {
    expect(findHexColors('color: #f00c;')).toStrictEqual([
      { color: '#f00c', start: 7, end: 12 },
    ]);
  });

  test('matches 6-digit hex colors', () => {
    expect(findHexColors('color: #ff0000;')).toStrictEqual([
      { color: '#ff0000', start: 7, end: 14 },
    ]);
  });

  test('matches 8-digit hex colors with alpha', () => {
    expect(findHexColors('color: #ff0000cc;')).toStrictEqual([
      { color: '#ff0000cc', start: 7, end: 16 },
    ]);
  });

  test('lowercases the color value', () => {
    expect(findHexColors('#FfAa00')).toStrictEqual([
      { color: '#ffaa00', start: 0, end: 7 },
    ]);
  });

  test('matches multiple colors in the same string', () => {
    expect(findHexColors('a #fff b #000 c')).toStrictEqual([
      { color: '#fff', start: 2, end: 6 },
      { color: '#000', start: 9, end: 13 },
    ]);
  });

  test('rejects 5-digit hex sequences', () => {
    expect(findHexColors('#fffff')).toStrictEqual([]);
  });

  test('rejects 7-digit hex sequences', () => {
    expect(findHexColors('#1234567')).toStrictEqual([]);
  });

  test('rejects non-hex characters following the color', () => {
    expect(findHexColors('#fffzzz')).toStrictEqual([
      { color: '#fff', start: 0, end: 4 },
    ]);
  });
});
