import { describe, expect, test } from 'vitest';
import { findColors } from './colors';

describe(findColors, () => {
  test('matches 3-digit hex colors', () => {
    expect(findColors('color: #f00;')).toStrictEqual([
      { color: '#f00', start: 7, end: 11 },
    ]);
  });

  test('matches 4-digit hex colors with alpha', () => {
    expect(findColors('color: #f00c;')).toStrictEqual([
      { color: '#f00c', start: 7, end: 12 },
    ]);
  });

  test('matches 6-digit hex colors', () => {
    expect(findColors('color: #ff0000;')).toStrictEqual([
      { color: '#ff0000', start: 7, end: 14 },
    ]);
  });

  test('matches 8-digit hex colors with alpha', () => {
    expect(findColors('color: #ff0000cc;')).toStrictEqual([
      { color: '#ff0000cc', start: 7, end: 16 },
    ]);
  });

  test('lowercases the color value', () => {
    expect(findColors('#FfAa00')).toStrictEqual([
      { color: '#ffaa00', start: 0, end: 7 },
    ]);
  });

  test('matches multiple colors in the same string', () => {
    expect(findColors('a #fff b #000 c')).toStrictEqual([
      { color: '#fff', start: 2, end: 6 },
      { color: '#000', start: 9, end: 13 },
    ]);
  });

  test('rejects 5-digit hex sequences', () => {
    expect(findColors('#fffff')).toStrictEqual([]);
  });

  test('rejects 7-digit hex sequences', () => {
    expect(findColors('#1234567')).toStrictEqual([]);
  });

  test('rejects non-hex characters following the color', () => {
    expect(findColors('#fffzzz')).toStrictEqual([
      { color: '#fff', start: 0, end: 4 },
    ]);
  });

  test('matches rgb() with comma syntax', () => {
    expect(findColors('color: rgb(255, 0, 0);')).toStrictEqual([
      { color: 'rgb(255, 0, 0)', start: 7, end: 21 },
    ]);
  });

  test('matches rgba() with comma syntax and alpha', () => {
    expect(findColors('color: rgba(255, 0, 0, 0.5);')).toStrictEqual([
      { color: 'rgba(255, 0, 0, 0.5)', start: 7, end: 27 },
    ]);
  });

  test('matches rgb() with whitespace syntax', () => {
    expect(findColors('color: rgb(255 0 0);')).toStrictEqual([
      { color: 'rgb(255 0 0)', start: 7, end: 19 },
    ]);
  });

  test('matches rgb() with whitespace syntax and slash alpha', () => {
    expect(findColors('color: rgb(255 0 0 / 0.5);')).toStrictEqual([
      { color: 'rgb(255 0 0 / 0.5)', start: 7, end: 25 },
    ]);
  });

  test('matches rgb() with percentage alpha', () => {
    expect(findColors('color: rgb(255 0 0 / 50%);')).toStrictEqual([
      { color: 'rgb(255 0 0 / 50%)', start: 7, end: 25 },
    ]);
  });

  test('matches rgb() with percentage components', () => {
    expect(findColors('color: rgb(100%, 0%, 0%);')).toStrictEqual([
      { color: 'rgb(100%, 0%, 0%)', start: 7, end: 24 },
    ]);
  });

  test('lowercases rgb keyword', () => {
    expect(findColors('RGBA(255, 0, 0, 1)')).toStrictEqual([
      { color: 'rgba(255, 0, 0, 1)', start: 0, end: 18 },
    ]);
  });

  test('returns hex and rgb matches in source order', () => {
    expect(findColors('#fff and rgb(0, 0, 0) and #abc')).toStrictEqual([
      { color: '#fff', start: 0, end: 4 },
      { color: 'rgb(0, 0, 0)', start: 9, end: 21 },
      { color: '#abc', start: 26, end: 30 },
    ]);
  });

  test('matches hsl() with comma syntax', () => {
    expect(findColors('color: hsl(120, 100%, 50%);')).toStrictEqual([
      { color: 'hsl(120, 100%, 50%)', start: 7, end: 26 },
    ]);
  });

  test('matches hsla() with comma syntax and alpha', () => {
    expect(findColors('color: hsla(120, 100%, 50%, 0.5);')).toStrictEqual([
      { color: 'hsla(120, 100%, 50%, 0.5)', start: 7, end: 32 },
    ]);
  });

  test('matches hsl() with whitespace syntax', () => {
    expect(findColors('color: hsl(120 100% 50%);')).toStrictEqual([
      { color: 'hsl(120 100% 50%)', start: 7, end: 24 },
    ]);
  });

  test('matches hsl() with whitespace syntax and slash alpha', () => {
    expect(findColors('color: hsl(120 100% 50% / 0.5);')).toStrictEqual([
      { color: 'hsl(120 100% 50% / 0.5)', start: 7, end: 30 },
    ]);
  });

  test('matches hsl() with deg unit on hue', () => {
    expect(findColors('color: hsl(120deg 100% 50%);')).toStrictEqual([
      { color: 'hsl(120deg 100% 50%)', start: 7, end: 27 },
    ]);
  });

  test('matches hsl() with turn unit on hue', () => {
    expect(findColors('color: hsl(0.5turn 100% 50%);')).toStrictEqual([
      { color: 'hsl(0.5turn 100% 50%)', start: 7, end: 28 },
    ]);
  });

  test('lowercases hsl keyword', () => {
    expect(findColors('HSLA(120, 100%, 50%, 1)')).toStrictEqual([
      { color: 'hsla(120, 100%, 50%, 1)', start: 0, end: 23 },
    ]);
  });
});
