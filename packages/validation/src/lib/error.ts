import { default as chalk } from 'chalk';
import nodePath from 'path';
import { install as installSourceMapSupport } from 'source-map-support';
import { fileURLToPath } from 'url';

export const red = chalk.rgb(181, 30, 7);
export const purple = chalk.rgb(181, 84, 255);
export const gold = chalk.rgb(214, 181, 32);
export const gray = chalk.gray;
export const blue = chalk.rgb(7, 123, 181);

const prettyParserSymbol = Symbol('pretty-parser');

/**
 * Default file-path-replacer, for the @bscotch/tech
 * development environment.
 */
export const replaceFilePaths =
  process.env.BSCOTCH_REPO === '@bscotch/tech'
    ? [
        {
          pattern: /^(.*[\\/])node_modules[\\/]@bscotch([\\/].+)$/,
          replacer: '$1projects$2',
        },
      ]
    : undefined;

export interface ImproveErrorTracingOptions {
  /**
   * Source-map support is added by default,
   * using the `source-map-support` package.
   *
   * Prevent adding source-map support by setting
   * this to `true`.
   *
   * @default false
   */
  noSourceMaps?: boolean;

  /**
   * For the best possible developer experience,
   * filepaths sometimes need to be rewritten for
   * compatibility with other tools, or just to
   * be more readable.
   *
   * Each found filepath will have each provided
   * replacer applied to it, in sequence.
   */
  replaceFilePaths?: {
    /**
     * A regex with any capture groups to be
     * referred to in the replacement. Any
     * filepath matching this pattern will
     * be replaced via `${filepath}.replace(pattern, replacer)`.
     */
    pattern: RegExp;
    replacer: string;
  }[];
}

/**
 * Overwrite the stack traces of thrown errors
 * to be more human-readable and to have improved
 * DX.
 */
export function prettifyErrorTracing(options?: ImproveErrorTracingOptions) {
  if (!options?.noSourceMaps) {
    installSourceMapSupport();
  }
  const oldPrepareStackTrace = Error.prepareStackTrace as Exclude<
    typeof Error.prepareStackTrace,
    undefined
  > & { [prettyParserSymbol]?: boolean };
  if (oldPrepareStackTrace && !oldPrepareStackTrace[prettyParserSymbol]) {
    const newPrepare: typeof oldPrepareStackTrace = (err, trace) => {
      const asString = oldPrepareStackTrace(err, trace);
      if (!asString || typeof asString != 'string') {
        return asString;
      }
      return prettifyError(
        { name: err.name, stack: asString, message: err.message },
        options,
      );
    };
    newPrepare[prettyParserSymbol] = true;
    Error.prepareStackTrace = newPrepare;
  }
}

export function prettifyStack(
  stack: string | undefined,
  options?: ImproveErrorTracingOptions,
) {
  if (!stack) {
    return [];
  }
  const trace = parseTraceFromStack(stack, options);
  const lines: string[] = [];
  for (const line of trace) {
    // eslint-disable-next-line prefer-const
    let [contextOrMethod, method] = line.what.split('.');
    const context = method ? contextOrMethod : undefined;
    method = method || contextOrMethod;
    let what = context ? `${purple(context)}${gray('.')}` : '';
    what += gold(method);
    const inFile = gray(`:${line.line}:${line.column}`);
    const where = `${blue.underline(line.file)}${inFile}`;
    lines.push(`${what}\n${where}`);
  }
  return lines;
}

export function prettifyError(
  err: { name: string; message: string; stack?: string },
  options?: ImproveErrorTracingOptions,
) {
  return `\n${red(err.name)}\n${err.message}\n${prettifyStack(
    err.stack,
    options,
  ).join('\n')}`;
}

interface TraceParts {
  what: string;
  file: string;
  line: number;
  column: number;
}

function parseTraceFromStack(
  stack: string,
  options?: ImproveErrorTracingOptions,
): TraceParts[] {
  const traceLinePattern =
    /^\s+at (?<what>[^\s]+) \((?<file>.+?)(:(?<line>\d+):(?<column>\d+))\)?$/;
  const trace = stack
    .split(/[\r\n]+/)
    .map((l) => {
      const match = l.match(traceLinePattern)?.groups as TraceParts | undefined;
      if (!match) {
        return;
      }
      if (match.file.startsWith('file://')) {
        match.file = fileURLToPath(match.file);
      }
      match.file = nodePath.normalize(match.file);
      const replacer = options?.replaceFilePaths?.find((replacer) =>
        match.file.match(replacer.pattern),
      );
      if (replacer) {
        match.file = match.file.replace(replacer.pattern, replacer.replacer);
      } else if (
        ['node:internal', 'node_modules'].some((ignore) =>
          match.file.includes(ignore),
        )
      ) {
        // Skip if in node_modules
        return;
      }
      return match;
    })
    .filter(Boolean) as TraceParts[];
  return trace;
}

/**
 * For errors meant for user consumption that do
 * not need a stack trace.
 */
export class UserError extends Error {
  constructor(message: string, assertionFunction?: (...args: any[]) => void) {
    super(message);
    this.name = 'UserError';
    Error.captureStackTrace(this, assertionFunction || this.constructor);
    // this.stack = prettifyStack(this, this.stack!);
  }
}

export function assertUserClaim(claim: any, message: string): asserts claim {
  if (!claim) {
    throw new UserError(message, assertUserClaim);
  }
}
