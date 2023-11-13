import type { Promisable } from 'type-fest';
import type { Pathy } from './pathy.js';

type PathyReadEncoding = BufferEncoding | false;
export type PathySchema<Out> = { parse: (input: unknown) => Out };

export type PathyReadOutput<
  Parsed,
  Fallback,
  Schema extends PathySchema<Parsed> | never,
> = never extends Schema
  ? // NO SCHEMA
    never extends Fallback
    ? // NO SCHEMA, NO FALLBACK (so either parsed or throw)
      Parsed
    : // NO SCHEMA, YES FALLBACK
      Parsed | Fallback
  : // YES SCHEMA (would override fallback, so that's all we need to know)
    Parsed;

/**
 * When Pathy reads the file at its current location,
 * it can optionally parse the file.
 *
 * Options for the `Pathy.read()` method.
 */
export interface PathyReadOptions<
  Parsed,
  Fallback,
  Encoding extends PathyReadEncoding,
  Schema extends PathySchema<Parsed> | never,
> extends FileRetryOptions {
  /**
   * The file encoding. If this is false,
   * Pathy will leave the file contents as a buffer.
   * If a custom `parse` function is provided, that
   * buffer will be passed into it. Otherwise it will
   * be return in its raw buffer form.
   *
   * @default 'utf8'
   */
  encoding?: Encoding;

  /**
   * {@link Pathy} will attempt to parse the file by default,
   * based on its extension. Parsing methods may be added
   * or changed over time -- you can provide your own to
   * ensure that your files are parsed exactly as intended.
   *
   * If `false`:
   *
   * - If `encoding` is also `false`, the raw binary will be returned
   * - Otherwise returns the content as a string according to `encoding`
   *
   * If `true` or `undefined`, Pathy will attempt to parse
   * based on the file extension and its Pathy's available
   * parsers.
   *
   * If you provide a function, the result of calling that function
   * will be returned.
   *
   * Supported extensions (may not be up to date):
   *
   * - `.json` (also `.json5` and `.jsonc`)
   * - `.yaml` (also `.yml`)
   *
   * @default true
   */
  parse?:
    | boolean
    | ((rawContent: Encoding extends false ? Buffer : string) => Parsed);

  /**
   * By default pathy will throw an error if the file does not exist.
   * If you provide a default value, that value will be returned instead.
   *
   * Note that using this option removes the ability to distinguish between
   * a file that does not exist and one that contains the fallback value.
   */
  fallback?: Fallback;

  /**
   * If provided, the read file (or fallback) will be parsed by
   * this schema (Zod-compatible).
   */
  schema?: Schema;
}

export interface FileRetryOptions {
  /**
   * If there is an error and this is non-falsey, the read operation
   * will be attempted again up to this number of times.
   * @default 0
   */
  maxRetries?: number;

  /**
   * The time (in milliseconds) to wait between read-retry attempts.
   * @default 20
   */
  retryDelayMillis?: number;
}

export interface PathyWriteOptions extends FileRetryOptions {
  /**
   * {@link Pathy} will attempt to serialize the file,
   * based on its extension. Serialization methods may be added
   * or changed over time -- you can provide your own to
   * ensure that your files are parsed exactly as intended.
   *
   * If the data to write is not a string or buffer, Pathy assumes
   * that *it is not serialized*. For non-serialized data that Pathy
   * does not have a serializer for and for which you do not provide one,
   * Pathy will throw an error.
   *
   * If `false` the content must be a string or buffer, in which case,
   * it will be written as-is.
   *
   * If `true` or `undefined`, Pathy will attempt to serialize
   * based on the file extension and its available
   * serializers.
   *
   * If you provide a function, the result of calling that function
   * will be written to file. It must be a string or buffer.
   *
   * Supported extensions (may not be up to date):
   *
   * - `.json` (also `.json5` and `.jsonc`)
   * - `.yaml` (also `.yml`)
   *
   * @default true
   */
  serialize?: boolean | ((parsed: any) => Promisable<Buffer | string>);

  /**
   * Files often have trailing newlines,
   * even if that isn't how they get serialized.
   * Optionally ensure that a newline is
   * added to the end of the file for
   * built-in serilizers.
   */
  trailingNewline?: boolean;

  /**
   * Decide what will happen if the target
   * file already exists.
   *
   * @default 'overwrite'
   */
  onClobber?: 'error' | 'overwrite' | 'skip';

  /**
   * If provided, the data will be parsed by
   * this schema (Zod-compatible) before being written.
   */
  schema?: { parse: (input: unknown) => unknown };
}

/**
 * Options for the {@link Pathy.findParentPath} method.
 */
export interface PathyFindParentOptions<T = unknown> {
  /**
   * A function that, if it returns truthy, has identified
   * the parent path as the desired one. Can be async.
   *
   * Only paths whose basename matches that value will be tested.
   *
   * @example
   * // A function that reads the content of a package.json file
   * // and returns `true` if the `name` field matches an expected value
   * async (path)=>(await path.read()).name == '@scope/package-name'
   */
  test?: (path: Pathy<T>) => any;
}

export interface PathyListChildrenOptions<As = Pathy> {
  /**
   * If provided, filter returned filepaths based
   * on the result of calling this function on them.
   *
   * *💡 Does not mix intuitively with `includePatterns` or `excludePatterns`.*
   *
   * *⚠ Note differences between how files and dirs are handled!*
   *
   * For **files**:
   *  - Returning *truthy* includes the file in the results
   *  - Returning *falsey* excludes the file from the results
   *
   * For **directories**:
   *  - Returning a `false` literal excludes the directory from
   *    the recursive search
   *  - All other values, including `undefined` allow the
   *    directory to be searched
   *
   * @param path - The path to include or exclude.
   * @param siblings - The folders and files at the same
   * directory level as `path`. Useful, for example, for
   * skipping folders at the same level as a `package.json` file.
   */
  filter?: (path: Pathy, siblings: Pathy[]) => any;

  /**
   * Optionally only include files whose
   * extension matches something.
   *
   * @example
   * ['.js','.ts']
   * ['js','ts'] // Dot added automatically if missing!
   */
  includeExtension?: string[] | string;

  /**
   * Optionally exclude files whose
   * extension matches something.
   */
  excludeExtension?: string[] | string;

  /**
   * Matching basenames are flagged for inclusion, unless
   * overridden by `exclude`. When not set, all paths
   * are included.
   *
   * @default
   * undefined
   */
  includePatterns?: (RegExp | string)[];

  /**
   * Basenames that matched an `include` pattern can be
   * excluded by specifying a matching pattern.
   *
   * @default
   * undefined
   */
  excludePatterns?: (RegExp | string)[];

  /**
   * Some folders are completely ignored no matter
   * what the include/exclude parameters are. These
   * can be unignored with this option. Unignored paths
   * are treated the same way as any other paths
   * (e.g. they are not automatically included when
   * unignored, they just *can* be).
   */
  unignore?: (typeof Pathy.defaultIgnoredDirs)[number][];

  /**
   * Instead of picking the subset of ignored paths
   * to {@link unignore}, you can unignore *all*
   * default-ignored paths.
   *
   * Otherwise exactly the same idea as {@link unignore}.
   */
  unignoreAll?: boolean;

  /**
   * When a file is identified for inclusion,
   * this function will be called if
   * provided. It will be awaited, so
   * async functions are fine.
   *
   * This is useful for performing
   * actions on discovered files without
   * having to loop through all results
   * later.
   */
  onInclude?: (path: Pathy) => any;

  /**
   * By default files are included as Pathy instances.
   * Optionally transform them into something
   * else.
   */
  transform?: (
    path: Pathy,
  ) => As extends Promise<infer U> ? U | Promise<U> : As | Promise<As>;

  /**
   * Optionally limit the number of found paths,
   * cancelling the search once the limit is reached.
   *
   * This is a *soft* limit, since searches are
   * parallelized. You may get more results back than
   * the provided limit!
   */
  softLimit?: number;

  /**
   * The maximum depth of the recursion (number of
   * directories deep).
   *
   * (Zero-indexed, such that 0 only returns the
   * immediate children.)
   *
   * @default Infinity
   */
  maxDepth?: number;

  /**
   * By default only files are returned when conditions are met.
   * Set this to `true` to also return the directories that matched
   * (noting that directories and files are handled differently --
   * e.g. "includeExtension" only applies to files).
   *
   * If set to `'only'`, only directories will be returned.
   */
  includeDirs?: boolean | 'only';
}

export type PathyOrString = string | Pathy;

export interface PathyInfix {
  name: string;
  infix: string;
  ext: string;
}

export interface PathyCopyOptions {
  force?: boolean;
  maxRetries?: number;
  recursive?: boolean;
  retryDelay?: number;
}

export interface PathyRemoveOptions {
  force?: boolean;
  maxRetries?: number;
  recursive?: boolean;
  retryDelay?: number;
  /**
   * By default, if the target path doesn't exist no error is thrown.
   * Set this to `true` to throw an error if the target path doesn't exist.
   */
  throwIfMissing?: boolean;
}
