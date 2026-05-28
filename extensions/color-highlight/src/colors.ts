// Matches hex colors of 3, 4, 6, or 8 digits. The trailing negative lookahead
// prevents partial matches like `#fffff` (5 digits) being matched as `#fff`.
const HEX_COLOR_REGEXP =
  /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;

export interface HexColorMatch {
  /** The hex color value, including the leading `#`, lowercased. */
  color: string;
  /** Offset of the `#` character in the input string. */
  start: number;
  /** Offset just past the last character of the match. */
  end: number;
}

export function findHexColors(text: string): HexColorMatch[] {
  return [...text.matchAll(HEX_COLOR_REGEXP)].map((match) => ({
    color: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}
