import {
  arrayIsDuplicates,
  Sequential,
  stringIsMatch,
} from '@bscotch/utility/browser';
import { ok } from 'assert';
import type { Stats } from 'fs';
import fse from 'fs-extra';
import json5 from 'json5';
import nodePath from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import type { Pathy } from './pathy.js';
import { trace } from './pathy.lib.js';
import type {
  PathyFindParentOptions,
  PathyInfix,
  PathyListChildrenOptions,
  PathyOrString,
  PathyReadOptions,
  PathyReadOutput,
  PathySchema,
  PathyWriteOptions,
} from './pathy.types.js';

/**
 * A base class providing static functions for {@link Pathy}.
 * Can be used on its own if you want to make use of Pathy
 * normalization and methods while only using strings (instead
 * of Pathy instances).
 */
export class PathyStatic {
  /**
   * Normalize a path to posix-style separators and trim
   * trailing slashes.
   *
   * This provides better portability of paths across platforms,
   * and ensures that the same path always normalizes to the same
   * string value.
   */
  static normalize(path: PathyOrString): string {
    let cleanPath = typeof path === 'string' ? path : path.absolute;

    cleanPath ||= '.';

    try {
      cleanPath = cleanPath.startsWith('file://')
        ? fileURLToPath(cleanPath)
        : cleanPath;
    } catch {
      // We'll land here if we have a POSIX-style path
      // when we're on Windows.
      cleanPath = decodeURIComponent(cleanPath.replace(/^file:\/\//, ''));
    }
    cleanPath = nodePath.posix.normalize(cleanPath.replace(/\\+/g, '/'));
    // Ensure trailing slash if root, otherwise ensure
    // NO trailing slash
    if (cleanPath.match(/^[a-z]:$/i)) {
      cleanPath += '/';
    } else if (cleanPath !== '/' && !cleanPath.match(/^[a-z]:\/$/i)) {
      cleanPath = cleanPath.replace(/\/+$/, '');
    }

    const [, drive, rest] = cleanPath.match(/^([a-z]):(\/.*)$/i) || [];
    if (drive) {
      cleanPath = `${drive.toLowerCase()}:${rest}`;
    }
    return cleanPath;
  }

  /**
   * Replace the current path separators
   * withs something else. Defaults to the
   * separator of the current platform.
   */
  static replaceSeparator(path: string, separator = nodePath.sep) {
    return path.replace(/[\\/]+/g, separator);
  }

  static basename(path: PathyOrString) {
    return nodePath.posix.basename(PathyStatic.normalize(path));
  }

  /**
   * Check if a path has the given extension, ignoring case
   * and ensuring the `.` is present even if not provided in
   * the args (since that's always confusing).
   */
  static hasExtension(path: PathyOrString, ext: string): boolean {
    const normalized = PathyStatic.normalize(path);
    const normalizedExt = ext.startsWith('.') ? ext : `.${ext}`;
    return normalized.toLowerCase().endsWith(normalizedExt.toLowerCase());
  }

  /**
   * Instead of parsing a file as `{name}{.ext}`,
   * also parse out the infix if present: `{name}{.infix}{.ext}`.
   */
  static parseInfix(path: PathyOrString): PathyInfix {
    const basename = PathyStatic.basename(path);
    const parts = basename.match(
      /^(?<name>[^.]+)(?<infix>\.[^.]+)?(?<ext>\..*)$/,
    );
    return {
      name: parts?.groups!.name || basename,
      infix: parts?.groups!.infix || '',
      ext: parts?.groups!.ext || '',
    };
  }

  static removeInfix(path: PathyOrString): string {
    const parts = PathyStatic.parseInfix(path);
    if (!parts || !parts.infix) {
      return path.toString();
    }
    return `${parts.name}${parts.ext}`;
  }

  /**
   * Explode a path by splitting on the path separator.
   * Basically the opposite of {@link join}.
   *
   * Maintains consistent array length between relative and
   * absolute paths by having the first element be `'/'`
   * for absolute paths and `''` (nullstring) for
   * relative paths.
   *
   * @example
   * PathyStatic.explode('/a/b/c.js');
   * // ['/','a','b','c.js']
   * PathyStatic.explode('a/b/c.js');
   * // ['','a','b','c.js']
   */
  static explode(path: PathyOrString): string[] {
    path = PathyStatic.normalize(path);
    const segments = PathyStatic.normalize(path).split('/');
    if (segments[0] === '') {
      segments[0] = '/';
    } else {
      segments.unshift('');
    }
    return segments;
  }

  static compare(path1: PathyOrString, path2: PathyOrString): number {
    const path1Parts = PathyStatic.explode(path1);
    const path2Parts = PathyStatic.explode(path2);
    const minParts = Math.min(path1Parts.length, path2Parts.length);
    for (let i = 0; i < minParts; i++) {
      const part1 = path1Parts[i];
      const part2 = path2Parts[i];
      if (part1 !== part2) {
        return part1.localeCompare(part2);
      }
    }
    return path1Parts.length - path2Parts.length;
  }

  /**
   * Get all parent paths eventually leading to a given
   * path.
   *
   * @example
   * // Absolute
   * PathyStatic.lineage("/a/b/c.js");
   * // [
   * //   "/",
   * //   "/a",
   * //   "/a/b",
   * //   "/a/b/c.js",
   * // ]
   *
   * // Relative
   * PathyStatic.lineage("a/b/c.js");
   * // [
   * //   "",
   * //   "a",
   * //   "a/b",
   * //   "a/b/c.js",
   * // ]
   */
  static lineage(path: PathyOrString): string[] {
    path = PathyStatic.normalize(path);
    const parts = PathyStatic.explode(path);
    // A relative path has an imaginary leading "./",
    // such that an absolute and relative path with the
    // same lineage length will split into a different
    // number of parts.
    const lineage = Array(parts.length);
    for (let i = 0; i < parts.length; i++) {
      lineage[i] = PathyStatic.join(...parts.slice(0, i + 1));
    }
    return lineage;
  }

  static isAbsolute(path: PathyOrString): boolean {
    const normalized = PathyStatic.normalize(path);
    const isAbsoluteForPosix = nodePath.posix.isAbsolute(normalized);
    const isAbsoluteForWin32 = nodePath.win32.isAbsolute(normalized);
    return isAbsoluteForPosix || isAbsoluteForWin32;
  }

  static isRelative(path: PathyOrString): boolean {
    return !PathyStatic.isAbsolute(path);
  }

  static ensureAbsolute(
    path: PathyOrString,
    cwd: PathyOrString = process.cwd(),
  ): string {
    cwd = PathyStatic.normalize(cwd);
    if (!PathyStatic.isAbsolute(path)) {
      ok(PathyStatic.isAbsolute(cwd), `cwd must be absolute: ${cwd}`);
      return PathyStatic.join(cwd, path);
    }
    return PathyStatic.normalize(path);
  }

  static join(...paths: PathyOrString[]): string {
    const normalized = paths.map((p) =>
      typeof p === 'string' ? p : p.normalized,
    );
    return PathyStatic.normalize(nodePath.win32.join(...normalized));
  }

  static resolve(...paths: PathyOrString[]): string {
    return PathyStatic.normalize(
      nodePath.win32.resolve(...paths.map(PathyStatic.normalize)),
    );
  }

  @trace
  static resolveRelative(from: PathyOrString, to: PathyOrString): string {
    return PathyStatic.normalize(
      nodePath.win32.relative(
        PathyStatic.normalize(from),
        PathyStatic.normalize(to),
      ),
    );
  }

  /**
   * For two paths, represented as strings or Pathy instances,
   * returns `true` if their normalized paths are equal.
   *
   * @example
   * const p1 = new Pathy('/foo/bar');
   * Pathy.isSamePath(p1,'/foo/bar'); // true
   */
  static equals(firstPath: PathyOrString, otherPath: PathyOrString): boolean {
    // If one path has a cwd and the other does
    // not, assume the same cwd for the other
    const cwds = [firstPath, otherPath]
      .map((p) => (typeof p === 'string' ? undefined : p.workingDirectory))
      .filter((x) => x);
    const cwd = arrayIsDuplicates(cwds) && cwds[0];

    const normalized = [firstPath, otherPath].map((p) => {
      p = PathyStatic.normalize(p);
      if (cwd) {
        p = PathyStatic.resolve(cwd, p);
      }
      return p;
    });
    return normalized[0] === normalized[1];
  }

  /**
   * Given a collection of paths, determine their
   * common branch point (the directory at which they
   * stop sharing their path components).
   *
   * **NOTE:** take care to ensure that all paths are
   * relative to the same root, e.g. due to being
   * absolute or relative to the same cwd. Otherwise
   * you'll get unexpected results.
   */
  @trace
  static findBranchPoint(...paths: PathyOrString[]): string {
    ok(
      paths.length > 1,
      'At least two paths are required to find a shared parent.',
    );
    // Get the lineage of the first path and work towards
    // the last path, reducing the matching path
    // components as we go
    const branchpoint = PathyStatic.lineage(paths[0]);
    for (let i = 1; i < paths.length; i++) {
      const otherLineage = PathyStatic.lineage(paths[i]);
      for (let j = 0; j < branchpoint.length && j < otherLineage.length; j++) {
        if (branchpoint[j] !== otherLineage[j]) {
          // Then the prior value is their branchpoint.
          ok(j !== 0, 'Paths do not share a common branch point');
          branchpoint.splice(j);
        }
      }
    }
    return PathyStatic.join(...branchpoint);
  }

  /**
   * Determine if one path is the parent of another.
   *
   * Returns `true` if `parent` is a parent of `child`,
   * or if both are the same path.
   */
  @trace
  static isParentOf(parent: PathyOrString, child: PathyOrString): boolean {
    [parent, child] = [parent, child].map(PathyStatic.normalize);
    if (parent == child) {
      return true;
    }
    if (parent.length >= child.length) {
      return false;
    }
    return child.startsWith(parent) && child[parent.length] == '/';
  }

  static async listChildrenRecursively<As = Pathy>(
    dir: Pathy,
    options: PathyListChildrenOptions<As> = {},
  ): Promise<As[]> {
    await dir.isDirectory({ assert: true });
    const _children: As[] = [];
    const addChild = (child: Pathy) => {
      _children.push(
        (options?.transform ? options.transform(child) : child) as any,
      );
    };
    const ignoredDirs = options.unignoreAll
      ? []
      : options.unignore
      ? (PathyStatic.defaultIgnoredDirs.filter((dir) =>
          options.unignore?.includes(dir),
        ) as string[])
      : PathyStatic.defaultIgnoredDirs;
    const [includeExtension, excludeExtension] = [
      options.includeExtension,
      options.excludeExtension,
    ].map((ext) => {
      if (!ext || !ext.length) {
        return;
      }
      ext = Array.isArray(ext) ? ext : [ext];
      const exts = ext.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`));
      return (p: Pathy) => exts.some((e) => p.absolute.endsWith(e));
    });

    const hasReachedLimit = () =>
      options.softLimit && _children.length >= options.softLimit;

    async function innerLoop(currentPath: Pathy, depth = 0) {
      if (hasReachedLimit() || depth > (options?.maxDepth ?? Infinity)) {
        return;
      }

      const children = await currentPath.listChildren();
      for (const child of children) {
        if (hasReachedLimit()) {
          return;
        }
        // May have permissions problems trying to
        // stat administrative files etc. In those
        // cases, treat those as if they were ignored.
        try {
          await child.stat();
        } catch (err: any) {
          if (err.code === 'EPERM') {
            continue;
          }
          throw err;
        }

        // Handle dirs first!
        const checkDir = async () => {
          if (options?.includeDirs) {
            addChild(child);
          }
          return await innerLoop(child, depth + 1);
        };
        if (await child.isDirectory()) {
          if (ignoredDirs.includes(child.basename as any)) {
            continue;
          }
          if (options.filter) {
            if ((await options.filter?.(child, children)) !== false) {
              await checkDir();
            }
          } else if ('excludePatterns' in options) {
            if (!stringIsMatch(child.basename, options.excludePatterns!)) {
              await checkDir();
            }
          } else {
            await checkDir();
          }
          continue;
        }
        // Then is a file
        if (options?.includeDirs === 'only') {
          continue;
        }
        if (includeExtension) {
          if (!includeExtension(child)) {
            continue;
          }
        }
        if (excludeExtension) {
          if (excludeExtension(child)) {
            continue;
          }
        }
        if (options.filter) {
          if (!(await options.filter?.(child, children))) {
            continue;
          }
        }
        if (options.includePatterns) {
          if (!stringIsMatch(child.basename, options.includePatterns!)) {
            continue;
          }
        }
        if (options.excludePatterns) {
          if (stringIsMatch(child.basename, options.excludePatterns!)) {
            continue;
          }
        }
        addChild(child);
        if (options?.onInclude) {
          await options.onInclude(child);
        }
      }
    }

    await innerLoop(dir);

    return await Promise.all(_children);
  }

  /**
   * Starting in the `startDir`, work up the directory tree
   * looking for a file that matches `basename` in each
   * parent directory.
   */
  static async findParentPath<T = unknown>(
    from: Pathy,
    basename: string,
    options?: PathyFindParentOptions<T>,
  ): Promise<Pathy | undefined> {
    let currentPath = from;
    while (!currentPath.isRoot) {
      const possibleParent = currentPath.append(basename) as Pathy<T>;
      const exists = await possibleParent.exists();
      if (exists) {
        const isMatch = !options?.test || (await options.test(possibleParent));
        if (isMatch) {
          return possibleParent;
        }
      }
      currentPath = currentPath.up();
    }
    return;
  }

  static findParentPathSync(
    from: Pathy,
    basename: string,
    options?: PathyFindParentOptions,
  ): Pathy | undefined {
    let currentPath = from;
    while (!currentPath.isRoot) {
      const possibleParent = currentPath.append(basename);
      const exists = possibleParent.existsSync();
      if (exists) {
        const isMatch = !options?.test || options.test(possibleParent);
        if (isMatch) {
          return possibleParent;
        }
      }
      currentPath = currentPath.up();
    }
    return;
  }

  /**
   * For file extensions that indicate identical or similar
   * content serialization, get a normalized extension. This
   * is useful for simplifying parser/serializer lookups.
   *
   * Currently only supports JSON and YAML extensions.
   */
  static normalizedExtension(filepath: PathyOrString) {
    // Attempt to infer the parser to use
    const extensionMatcher = /\.((?<yaml>ya?ml)|(?<json>json[c5]?))$/;
    const extensionMatch =
      PathyStatic.basename(filepath).match(extensionMatcher);
    if (!extensionMatch) {
      return;
    }
    const fileType = extensionMatch.groups as { yaml?: string; json?: string };
    return Object.entries(fileType).find(([, value]) => value)?.[0];
  }

  static async stat(filepath: PathyOrString): Promise<Stats> {
    return typeof filepath == 'string'
      ? await fse.stat(filepath)
      : filepath.stat();
  }

  static async exists(filepath: PathyOrString): Promise<boolean> {
    try {
      await PathyStatic.stat(filepath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Write data to file, using the extension to determine
   * the serialization method.
   *
   * If the incoming data is a string, it is already assumed
   * to be serialized when writing to JSON or YAML.
   */
  @Sequential({
    subqueueBy: (p: PathyOrString) => PathyStatic.normalize(p),
  })
  static async write(
    filepath: PathyOrString,
    data: any,
    options?: PathyWriteOptions,
  ): Promise<void> {
    data = options?.schema ? options.schema.parse(data) : data;
    filepath = PathyStatic.ensureAbsolute(filepath);
    const extension = PathyStatic.normalizedExtension(filepath);
    const onClobber = options?.onClobber || 'overwrite';
    if (onClobber !== 'overwrite' && (await PathyStatic.exists(filepath))) {
      ok(onClobber !== 'error', 'File already exists');
      return;
    }
    await fse.ensureDir(nodePath.dirname(filepath));
    let serialized: string | Buffer;
    if (typeof options?.serialize == 'function') {
      serialized = await options.serialize(data);
    } else if (options?.serialize === false) {
      serialized = data;
    } else if (typeof data == 'string' || Buffer.isBuffer(data)) {
      serialized = data;
    } else if (extension == 'json') {
      serialized = JSON.stringify(data, null, 2);
    } else if (extension == 'yaml') {
      serialized = yaml.stringify(data);
    } else {
      // We work with a lot of JSON files that don't
      // end with a .json extension, and anyway JSON
      // is the most natural way to write JavaScript
      // data structures.
      serialized = JSON.stringify(data, null, 2);
    }
    ok(
      typeof serialized == 'string' || Buffer.isBuffer(serialized),
      'Unable to serialize data as a string or buffer for writing.',
    );
    ok(
      serialized.length,
      `Data serialized to nullish value for file ${filepath}. Data was of type ${typeof data}.`,
    );
    if (
      options?.trailingNewline &&
      typeof serialized === 'string' &&
      serialized.at(-1) !== '\n'
    ) {
      serialized += '\n';
    }
    await fse.writeFile(filepath, serialized);
  }

  /**
   * Read the file at a given path, automatically parsing
   * it if the extension is supported (parsing can be customized).
   */
  @Sequential({
    shareQueueWith: 'write',
    subqueueBy: (p: PathyOrString) => PathyStatic.normalize(p),
  })
  static async read<
    Parsed = unknown,
    Fallback = never,
    Encoding extends BufferEncoding | false = 'utf8',
    Schema extends PathySchema<Parsed> | never = never,
  >(
    filepath: PathyOrString,
    options?: PathyReadOptions<Parsed, Fallback, Encoding, Schema>,
  ): Promise<PathyReadOutput<Parsed, Fallback, Schema>> {
    const doesExist = await PathyStatic.exists(filepath);
    const hasFallback = options && 'fallback' in options;
    const clean = (
      fileContent: unknown,
    ): PathyReadOutput<Parsed, Fallback, Schema> =>
      options?.schema
        ? options.schema.parse(fileContent)
        : (fileContent as any);
    ok(doesExist || hasFallback, `File does not exist: ${filepath}`);
    const fileInfo = doesExist ? await PathyStatic.stat(filepath) : undefined;
    const isDirectory = doesExist && fileInfo!.isDirectory();
    ok(!isDirectory, `Expected file, found directory: ${filepath}`);
    if (!doesExist) {
      ok(hasFallback, `No file found at: ${filepath}`);
      return clean(options!.fallback!);
    }

    const doNotParse = options?.parse === false;
    const customParser =
      typeof options?.parse == 'function' ? options.parse : undefined;

    // Handle the binary case
    const binary = await fse.readFile(filepath.toString());

    if (options?.encoding === false) {
      if (customParser) {
        return clean(await customParser(binary as any));
      }
      return clean(binary as any);
    }

    // Handle the encoded text case
    const encoding = options?.encoding || 'utf8';
    const decoded = binary.toString(encoding as Exclude<Encoding, false>);
    if (customParser) {
      return clean(await customParser(decoded as any));
    } else if (doNotParse) {
      return clean(decoded as any);
    }
    // Attempt to infer the parser to use
    const fileType = PathyStatic.normalizedExtension(filepath);
    if (!fileType) {
      return clean(decoded as any);
    }
    try {
      if (fileType == 'yaml') {
        return clean(yaml.parse(decoded));
      } else if (fileType == 'json') {
        return clean(json5.parse(decoded));
      }
    } catch (err) {
      console.error(err);
      throw new Error(`Unable to parse file: ${filepath}`, { cause: err });
    }

    throw new Error(`Impossible outcome: should have matched filetype.`);
  }

  static get defaultIgnoredDirs() {
    return [
      'node_modules',
      '.git',
      '.hg',
      '.svn',
      '.idea',
      '.vscode',
      '.vscode-test',
    ] as const;
  }
}
