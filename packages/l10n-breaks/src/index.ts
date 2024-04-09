export const punctuation = {
  noLeftBreak: [
    '。', // Ideographic Full Stop
    '，', // Fullwidth Comma
    '；', // Fullwidth Semicolon
    '：', // Fullwidth Colon
    '？', // Fullwidth Question Mark
    '！', // Fullwidth Exclamation Mark
    '）', // Fullwidth Right Parenthesis
    '】', // Right Black Lenticular Bracket
    '」', // Right Corner Bracket
    '』', // Right White Corner Bracket
    '》', // Right Double Angle Bracket
    '、', // Ideographic Comma
    '…', // Horizontal Ellipsis
    '—', // Em Dash
    '-', // Hyphen-Minus
    ',', // Comma
    '.', // Period
    ':', // Colon
    ';', // Semicolon
    '!', // Exclamation Point
    '?', // Question Mark
    '”', // Right Double Quotation Mark
    '’', // Right Single Quotation Mark
    ')', // Right Parenthesis
    ']', // Right Square Bracket
    '}', // Right Curly Bracket
    '"', // Quotation Mark
    "'", // Single Quote
    ' ', // Space
  ],
  noRightBreak: [
    '（', // Fullwidth Left Parenthesis
    '【', // Left Black Lenticular Bracket
    '「', // Left Corner Bracket
    '『', // Left White Corner Bracket
    '《', // Left Double Angle Bracket
    '“', // Left Double Quotation Mark
    '‘', // Left Single Quotation Mark
    '(', // Left Parenthesis
    '[', // Left Square Bracket
    '{', // Left Curly Bracket
    '"', // Quotation Mark
    "'", // Single Quote
  ],
};

/**
 * Given a string, split it into an array of strings where
 * each entry is a single character
 * (if ideographic, like Chinese/Japanese) or a word unit
 * (if English).
 *
 * Punctuation marks are grouped with the right or left word
 * unit, depending on the type of punctuation.
 *
 * Handles mixed ideographic and English characters.
 *
 * (See the {@link punctuation} rules.)
 */
export function splitOnBreakpoints(text: string) {
  const result = [];
  const chars = [...text];
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i];
    if (i === 0) {
      result.push(char);
      continue;
    }
    const priorChar = chars[i - 1];
    if (
      punctuation.noLeftBreak.includes(char) ||
      punctuation.noRightBreak.includes(priorChar) ||
      (!punctuation.noLeftBreak.includes(priorChar) &&
        isNotIdeographic(char) &&
        isNotIdeographic(priorChar))
    ) {
      result[result.length - 1] += char;
      continue;
    }
    result.push(char);
  }
  return result;
}

export function isNotIdeographic(glyph: string) {
  return /^[\u0020-\u2BFF]+$/.test(glyph);
}
