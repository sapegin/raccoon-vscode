// Matches hex colors of 3, 4, 6, or 8 digits. The trailing negative lookahead
// prevents partial matches like `#fffff` (5 digits) being matched as `#fff`.
const HEX_COLOR_REGEXP =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

// Matches CSS `rgb()` and `rgba()` colors in both the legacy comma syntax
// (`rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`) and the modern whitespace syntax
// (`rgb(255 0 0)`, `rgb(255 0 0 / 50%)`). Components may be integers, decimals,
// or percentages.
const RGB_NUMBER = String.raw`-?\d*\.?\d+%?`;
const RGB_COLOR_REGEXP = new RegExp(
  String.raw`rgba?\(\s*${RGB_NUMBER}(?:\s*,\s*${RGB_NUMBER}){2,3}\s*\)` +
    '|' +
    String.raw`rgba?\(\s*${RGB_NUMBER}(?:\s+${RGB_NUMBER}){2}(?:\s*\/\s*${RGB_NUMBER})?\s*\)`,
  'gi'
);

export interface ColorMatch {
  /** The color value, lowercased. */
  color: string;
  /** Offset of the first character of the match in the input string. */
  start: number;
  /** Offset just past the last character of the match. */
  end: number;
}

export function findColors(text: string): ColorMatch[] {
  const matches = [
    ...text.matchAll(HEX_COLOR_REGEXP),
    ...text.matchAll(RGB_COLOR_REGEXP),
  ];
  return matches
    .map((match) => ({
      color: match[0].toLowerCase(),
      start: match.index,
      end: match.index + match[0].length,
    }))
    .toSorted((a, b) => a.start - b.start);
}
