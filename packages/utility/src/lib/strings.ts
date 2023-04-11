import type {
  ArrayOrSingleton,
  RegExpExecArrayWithIndices,
} from '../types/utility.js';
import { arrayWrapped } from './array.js';
import { BscotchUtilError } from './types.js';

function withoutInitialLinebreaks(string: string) {
  return string.replace(/^[\r\n]+/, '');
}

function withoutTrailingWhitespace(string: string) {
  return string.replace(/\s+$/, '');
}

function cleanTemplate(strings: TemplateStringsArray, ...interps: any[]) {
  // Trim these things up
  const cleanStrings = [...strings];
  cleanStrings[0] = withoutInitialLinebreaks(cleanStrings[0]);
  const lastStringIdx = cleanStrings.length - 1;
  cleanStrings[lastStringIdx] = withoutTrailingWhitespace(
    cleanStrings[lastStringIdx],
  );

  // For each interp, if it has newlines when stringified each
  // line after the first needs to inherit the indentation
  // level of its starting point.
  let string = '';
  for (let i = 0; i < cleanStrings.length; i++) {
    string += cleanStrings[i];
    if (i == lastStringIdx) {
      break;
    }
    let interp = `${interps[i]}`;
    const linebreakRegex = /(\r?\n)/;
    const interpLines = interp.split(linebreakRegex).filter((x) => x);
    if (interpLines.length && i < lastStringIdx) {
      // How indented are we?
      const indentMatch = string.match(/\n?([^\n]+?)$/);
      if (indentMatch) {
        // amount of indent to add to each entry that is a break
        // (skip the last one, since if it's a newline we don't
        //  want that to cause an indent on the next line also)
        for (let i = 0; i < interpLines.length; i++) {
          if (interpLines[i].match(linebreakRegex)) {
            interpLines[i] += ' '.repeat(indentMatch[1].length);
          }
        }
      }
    }
    interp = interpLines.join('');
    string += interp;
  }
  return string;
}

export function sortStringsByLength(strings: string[]) {
  return strings.sort((string1, string2) => string1.length - string2.length);
}

export function getShortestString(strings: string[]) {
  return sortStringsByLength(strings)[0];
}

/**
 * Shift all lines left by the *smallest* indentation level,
 * and remove initial newline and all trailing spaces.
 * Lines that only have spaces are not used to determine the
 * indentation level.
 *
 * @example
 * undent`
 *  All lines will
 * be un-inindented
 *    based on the line
 *  with the smallest indentation.
 * `;
 * // =>
 * //`  All lines will
 * //be un-inindented
 * //    based on the line
 * //  with the smallest indentation.`
 *
 */
export function undent(strings: TemplateStringsArray, ...interps: any[]) {
  const string = cleanTemplate(strings, ...interps);
  // Remove initial and final newlines
  // Find all indentations *on lines that are not just whitespace!*
  const indentRegex = /^(?<indent>[ \t]*)(?<nonSpace>[^\s])?/;
  const dents: string[] | null = string
    .match(new RegExp(indentRegex, 'gm'))
    ?.map((dentedLine): string | void => {
      const { indent, nonSpace } = dentedLine.match(indentRegex)!.groups as {
        indent?: string;
        nonSpace?: string;
      };
      const isNotJustWhitespace = nonSpace?.length;
      if (isNotJustWhitespace) {
        return indent || '';
      }
      return;
    })
    .filter((indentLevel) => typeof indentLevel == 'string') as string[];
  if (!dents || dents.length == 0) {
    return string;
  }
  const minDent = getShortestString(dents);
  if (!minDent) {
    // Then min indentation is 0, no change needed
    return string;
  }
  const dedented = string.replace(new RegExp(`^${minDent}`, 'gm'), '');
  return dedented;
}

/**
 * Remove ALL indents, from every line.
 *
 * @example
 * nodent`
 *  All lines will
 * be un-indented
 *    completely
 *  but still on separate lines.
 * `;
 * // =>
 * //`All lines will
 * //be un-indented
 * //completely
 * //but still on separate lines.`
 *
 */
export function nodent(strings: TemplateStringsArray, ...interps: any[]) {
  let string = cleanTemplate(strings, ...interps);
  // Remove initial and final newlines
  string = string.replace(/^[\r\n]+/, '').replace(/\s+$/, '');
  return string
    .split(/\r?\n/g)
    .map((line) => line.replace(/^\s*(.*?)/, '$1'))
    .join('\n');
}

/**
 * Remove linebreaks and extra spacing in a template string.
 *
 * @example
 * oneline`
 *  This string
 *      will be converted
 *  into
 *            one that is
 *  on a single line.
 * `;
 * // => "This string will be converted into one that is on a single line."
 */
export function oneline(strings: TemplateStringsArray, ...interps: any[]) {
  return cleanTemplate(strings, ...interps)
    .replace(/^\s+/, '')
    .replace(/\s+$/, '')
    .replace(/\s+/g, ' ');
}

export function encodeToBase64(content: string | Buffer) {
  return (Buffer.isBuffer(content) ? content : Buffer.from(content)).toString(
    'base64',
  );
}

export function decodeFromBase64(base64: string) {
  return Buffer.from(base64, 'base64').toString();
}

export function decodeFromBase64JsonString(string: string) {
  try {
    return JSON.parse(decodeFromBase64(string));
  } catch {
    throw new BscotchUtilError('Object is not JSON parseable');
  }
}

export function encodeToBase64JsonString(something: any) {
  try {
    return encodeToBase64(JSON.stringify(something));
  } catch {
    throw new BscotchUtilError('Object is not JSON stringifiable');
  }
}

export function capitalize(string: string) {
  return `${string}`.charAt(0).toLocaleUpperCase() + `${string}`.slice(1);
}

/**
 * Explode a string using a separator.
 */
export function explode(
  string: string | undefined,
  options?: {
    /** Only return first `limit` results (returns all by default) */
    limit?: number | null;
    /** Separator to explode on */
    sep?: string | RegExp;
    /** Nullstrings are skipped unless this is set to `true` */
    keepEmpty?: boolean;
    /** If `true`, only unique values returned (order not guaranteed) */
    unique?: boolean;
    /** By default the original string and all values are trimmed.
     * Set to `true` to prevent this behavior.
     */
    noTrim?: boolean;
  },
) {
  options ||= {};
  options.sep = typeof options.sep == 'undefined' ? /\s*,\s*/ : options.sep;
  if (!string || typeof string != 'string' || options.limit === 0) {
    return [];
  }
  let entries = string[options?.noTrim ? 'toString' : 'trim']()
    .split(options.sep)
    .map((entry) => (options?.noTrim ? entry : entry.trim()))
    .filter((entry) => entry || options?.keepEmpty);
  entries = entries.slice(0, options.limit || entries.length);
  return options.unique ? [...new Set(entries)] : entries;
}

/**
 * Check a string for a match against one or
 * more patterns. String patterns are tested
 * for an **exact** match, while RegExp patterns
 * are tested with `.test()`.
 *
 * Returns `true` if *any* patterns match.
 */
export function stringIsMatch(
  str: string,
  pattern: ArrayOrSingleton<RegExp | string>,
) {
  return arrayWrapped(pattern).some((pattern) => {
    if (pattern instanceof RegExp) {
      return pattern.test(str);
    }
    return str === pattern;
  });
}

export function matchAll<Groups extends string = string>(
  string: string,
  pattern: RegExp,
): IterableIterator<RegExpExecArrayWithIndices<Groups>> {
  let flags = pattern.flags;
  for (const requiredFlags of 'gd') {
    if (!flags.includes(requiredFlags)) {
      flags += requiredFlags;
    }
  }
  const matches = string.matchAll(new RegExp(pattern.source, flags));
  return matches as unknown as IterableIterator<
    RegExpExecArrayWithIndices<Groups>
  >;
}
