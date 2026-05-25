import { expect, test } from 'vitest';
import { symbolRegExp } from './symbolRegExp';

test.each([
  ['tacoCat'],
  ['taco_cat'],
  ['taco.cat'],
  ["taco['cat']"],
  ['taco["cat"]'],
  ['taco[13]'],
  ['taco?.cat'],
])('the symbol "%s" should match', (code) => {
  const match = code.match(symbolRegExp)?.[0] ?? '';
  expect(match).toHaveLength(code.length);
});

test.each([['taco-cat']])('the symbol "%s" should NOT match', (code) => {
  const match = code.match(symbolRegExp)?.[0] ?? '';
  expect(match).not.toHaveLength(code.length);
});
