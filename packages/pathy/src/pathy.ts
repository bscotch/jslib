import fs from 'fs';
import fse from 'fs-extra';
import nodePath from 'path';
import { rmSafe } from './fsSafe.js';
import { PathyStatic } from './pathy.static.js';
import type {
  FileRetryOptions,
  PathyCopyOptions,
  PathyFindParentOptions,
  PathyInfix,
  PathyListChildrenOptions,
  PathyOrString,
  PathyReadOptions,
  PathyReadOutput,
  PathyRemoveOptions,
  PathyWriteOptions,
} from './pathy.types.js';
import { arrayWrapped, assert } from './util.js';

export interface PathyOptions<T> {
  cwd?: PathyOrString;
  /**
   * Optionally provide a Zod-compatible schema/validator,
   * which will be used on read/write to file.
   */
  validator?: { parse: (v: unknown) => T };
}

/**
 * An **immutable** utility class for reducing the cognitive load of
 * working with file paths.
 *
 * Any operation that would return a new path will will return a new
 * {@link Pathy} instance.
 */
export class Pathy<FileContent = unknown> extends PathyStatic {
  /**
   * The normalized path, with whatever
   * absolute/relative status the original input
   * path had.
   *
   * Use {@link absolute} or
   * {@link relative} for
   * guaranteed-absolute/relative variants.
   */
  readonly normalized: string;
  /**
   * The normalized absolute path, as determined
   * by the cwd (provided or inferred) at instantiation
   * (or by the path itself if it was already absolute.)
   */
  readonly absolute: string;

  /**
   * The normalized relative path, as determined
   * by the cwd (provided or inferred) at instantiation.
   */
  readonly relative: string;

  /**
   * The working directory from when the instance
   * was created.
   */
  readonly workingDirectory: string;

  /**
   * A zod schema or other compatible validator, which will be used
   * during file read/write if provided.
   */
  readonly validator?: { parse: (v: unknown) => FileContent };

  constructor(path?: PathyOrString | string[], cwd?: PathyOrString);
  constructor(
    path?: PathyOrString | string[],
    options?: PathyOptions<FileContent>,
  );
  constructor(
    path: PathyOrString | string[] = process.cwd(),
    cwdOrOptions?: PathyOrString | PathyOptions<FileContent>,
  ) {
    super();
    const cwd = Pathy.isStringOrPathy(cwdOrOptions)
      ? cwdOrOptions
      : cwdOrOptions?.cwd ||
        (Pathy.isPathy(cwdOrOptions) && cwdOrOptions.workingDirectory) ||
        (Pathy.isPathy(path) && path.workingDirectory) ||
        process.cwd();
    this.workingDirectory = Pathy.normalize(cwd);
    this.normalized = Pathy.normalize(
      Array.isArray(path) ? Pathy.join(...path) : path,
    );
    this.absolute = Pathy.resolve(this.workingDirectory, this.normalized);
    this.relative = Pathy.resolveRelative(this.workingDirectory, this.absolute);
    this.validator =
      typeof cwdOrOptions === 'object'
        ? (cwdOrOptions.validator as PathyOptions<FileContent>['validator'])
        : undefined;
  }

  get directory(): string {
    return nodePath.win32.dirname(this.absolute);
  }

  get name(): string {
    return nodePath.win32.parse(this.normalized).name;
  }

  get basename(): string {
    return nodePath.win32.basename(this.normalized);
  }

  get extname(): string {
    return nodePath.extname(this.normalized);
  }

  withValidator<T>(validator: { parse: (v: unknown) => T }): Pathy<T> {
    return new Pathy(this, { cwd: this.workingDirectory, validator });
  }

  /**
   * Check if a path has the given extension, ignoring case
   * and ensuring the `.` is present even if not provided in
   * the args (since that's always confusing).
   */
  hasExtension(ext: string | string[]): boolean {
    return arrayWrapped(ext).some((e) => PathyStatic.hasExtension(this, e));
  }

  parseInfix(): PathyInfix {
    return Pathy.parseInfix(this);
  }

  /**
   * Whether this path is the root path.
   * This returns `true` when there is no parent directory.
   *
   * @example
   * new Pathy('/').isRoot; // true
   * new Pathy('c:/').isRoot; // true
   * new Pathy('c:/hello').isRoot; // false
   * new Pathy('c:\\').isRoot; // true
   * new Pathy('').isRoot; // false
   * new Pathy('/a/b').isRoot; // false
   * new Pathy('a').isRoot; // false
   */
  get isRoot(): boolean {
    return this.absolute === Pathy.normalize(this.directory);
  }

  /**
   * Get a new {@link Pathy} instance that contains the relative
   * bath from the current location to another.
   */
  relativeTo(to: string | Pathy = process.cwd()): string {
    return Pathy.resolveRelative(this.absolute, to.toString());
  }

  relativeFrom(from: string | Pathy = process.cwd()): string {
    return Pathy.resolveRelative(from.toString(), this.absolute);
  }

  /**
   * Change the path by moving up the tree some number of
   * levels.
   *
   * @example
   * const path = new Path('/a/b/c');
   * path.up(); // `/a/b`
   */
  up(levels = 1): Pathy {
    return this.resolveTo(...Array(levels).fill('..'));
  }

  join<T = unknown>(...paths: PathyOrString[]): Pathy<T> {
    return new Pathy(Pathy.join(this, ...paths), this.workingDirectory);
  }

  /**
   * Change to another path by jumping through a number
   * of relative or absolute paths, using `path.resolve` logic.
   *
   * @example
   * const path = new Path('/a/b');
   * path.resolveTo('c'); // `/a/b/c`
   * path.resolveTo('..'); // `/a/b`
   * path.resolveTo('c/d','e'); // `/a/b/c/d/e`
   * path.resolveTo('irrelevant','/new-root','../z'); // `/z`
   */
  resolveTo(...paths: PathyOrString[]): Pathy {
    return new Pathy(
      Pathy.resolve(this.absolute, ...paths),
      this.workingDirectory,
    );
  }

  async isDirectory(options?: { assert?: boolean }) {
    const metadata = await this.stat();
    const isDirectory = metadata.isDirectory();
    assert(
      !options?.assert || isDirectory,
      `${this.absolute} is not a directory`,
    );
    return isDirectory;
  }

  isDirectorySync() {
    const metadata = this.statSync();
    return metadata.isDirectory();
  }

  async isFile() {
    const metadata = await this.stat();
    return metadata.isFile();
  }

  isFileSync() {
    const metadata = this.statSync();
    return metadata.isFile();
  }
  isParentOf(otherPath: PathyOrString) {
    return Pathy.isParentOf(this, otherPath);
  }

  isChildOf(otherPath: PathyOrString) {
    return Pathy.isParentOf(otherPath, this);
  }

  /**
   * Read the file at the current path automatically parsing
   * it if the extension is supported (see {@link Pathy.read}).
   */
  async read<
    Parsed = FileContent,
    Fallback = never,
    Encoding extends BufferEncoding | false = 'utf8',
    Schema extends { parse: (content: unknown) => Parsed } | never = never,
  >(
    options?: PathyReadOptions<Parsed, Fallback, Encoding, Schema>,
  ): Promise<PathyReadOutput<Parsed, Fallback, Schema>> {
    return await Pathy.read(this, {
      schema: this.validator as any,
      ...options,
    });
  }

  /**
   * Write to file at the current path, automatically serializing
   * if the extension is supported (see {@link Pathy.write}).
   */
  async write<T = FileContent>(
    data: T,
    options?: PathyWriteOptions,
  ): Promise<void> {
    return await Pathy.write(this, data, {
      schema: this.validator as any,
      ...options,
    });
  }

  /**
   * Whether or not a file/directory exists at this path.
   */
  async exists(
    options?: { assert?: boolean } & FileRetryOptions,
  ): Promise<boolean> {
    try {
      await this.stat(options);
      return true;
    } catch {
      if (options?.assert) {
        throw new Error(`Path ${this.absolute} does not exist`);
      }
      return false;
    }
  }

  existsSync(options?: { assert?: boolean }) {
    try {
      this.statSync();
      return true;
    } catch {
      if (options?.assert) {
        throw new Error(`Path ${this.absolute} does not exist`);
      }
      return false;
    }
  }

  async stat(options?: FileRetryOptions) {
    return await Pathy.stat(this.absolute, options);
  }

  statSync() {
    return fs.statSync(this.absolute);
  }

  /**
   * Check if this path leads to an empty directory.
   *
   * (If the path does not exist, will throw an error.)
   */
  async isEmptyDirectory(
    options: {
      assert?: boolean;
      /**
       * If `false`, may contain other directories, nested ad nauseam,
       * so long as no directory includes any *files*.
       *
       * If `true`, this directory must be *completely*
       * empty (no files *or* directories).
       *
       * @default false
       */
      strict?: boolean;

      /**
       * If `true`, if this path does not map onto
       * anything on disk the path will still be considered
       * an "empty directory" (i.e. returns `true`).
       */
      allowNotFound?: boolean;
    } = {},
  ): Promise<boolean> {
    const exists = await this.exists({ assert: !options.allowNotFound });
    if (!exists) {
      return true;
    }
    await this.isDirectory({ assert: true });
    let isEmpty = false;
    if (options.strict) {
      // Must be *literally nothing* in the directory
      isEmpty = (await fse.readdir(this.absolute)).length === 0;
    } else {
      // May contain other directories, but *NO FILES*.
      const foundFiles = await this.listChildrenRecursively({
        unignoreAll: true,
        softLimit: 1,
      });
      isEmpty = foundFiles.length === 0;
    }
    assert(
      !options?.assert || isEmpty,
      `${this.absolute} is not an empty directory`,
    );
    return isEmpty;
  }

  /**
   * Treat the path as a directory, and ensure
   * that it exists (creating any needed parent
   * directories as along the way).
   */
  async ensureDirectory() {
    await fse.mkdir(this.absolute, { recursive: true });
  }
  /**
   * @alias {@link Pathy.ensureDirectory}
   */
  readonly ensureDir = this.ensureDirectory;
  /**
   * @alias {@link Pathy.ensureDirectory}
   */
  readonly mkdir = this.ensureDirectory;

  /**
   * List all immediate children of this path.
   *
   * (The path must be folder, and the children
   * can be files or folders.)
   */
  async listChildren(): Promise<Pathy[]> {
    assert(await this.isDirectory(), `${this.normalized} is not a directory`);

    return (await fse.readdir(this.absolute)).map((entry) => {
      const path = this.join(entry);
      return new Pathy(path, this.workingDirectory);
    });
  }
  /**
   * @alias {@link Pathy.listChildren}
   */
  readonly ls = this.listChildren;

  listChildrenSync(): Pathy[] {
    assert(this.isDirectorySync(), `${this.normalized} is not a directory`);
    return fse.readdirSync(this.absolute).map((entry) => {
      const path = this.join(entry);
      return new Pathy(path, this.workingDirectory);
    });
  }

  /**
   * Copy this file/directory to another location.
   */
  async copy(destination: PathyOrString, options?: fse.CopyOptions) {
    destination = Pathy.asInstance(destination);
    const destinationParent = destination.up();
    await destinationParent.ensureDirectory();
    await fse.copy(this.absolute, destination.absolute, options);
  }
  /**
   * @alias {@link Pathy.copy}
   */
  readonly cp = this.copy;

  /**
   * Shorthand for performing a copy to destination, followed by deletion
   */
  async move(
    destination: PathyOrString,
    options?: fse.CopyOptions & PathyCopyOptions,
  ) {
    await this.copy(destination, options);
    await this.delete(options);
  }
  /**
   * @alias {@link Pathy.move}
   */
  readonly mv = this.move;

  /**
   * Delete this path.
   */
  async delete(options?: PathyRemoveOptions) {
    await rmSafe(this, options);
  }
  /**
   * @alias {@link Pathy.delete}
   */
  readonly rm = this.delete;

  async listSiblings() {
    const dir = this.up();
    return await dir.listChildren();
  }

  async findChild(
    basename: string | RegExp,
    options?: { assert?: boolean; recursive?: boolean },
  ) {
    let child: Pathy | undefined;
    if (options?.recursive) {
      const children = await this.listChildrenRecursively({
        includePatterns: [basename],
        softLimit: 1,
      });
      child = children[0];
    } else {
      child = (await this.listChildren()).find((c) =>
        typeof basename === 'string'
          ? c.basename === basename
          : basename.test(c.basename),
      );
    }
    assert(
      !options?.assert || child,
      `${this.absolute} does not have a child named ${basename}`,
    );
    return child;
  }

  async listChildrenRecursively<As = Pathy>(
    options: PathyListChildrenOptions<As> = {},
  ): Promise<As[]> {
    return await Pathy.listChildrenRecursively(this, options);
  }

  async findInParents<T = unknown>(
    basename: string,
    options?: PathyFindParentOptions<T>,
  ): Promise<Pathy<T> | undefined> {
    return (await Pathy.findParentPath(this, basename, options)) as any;
  }

  findInParentsSync(
    basename: string,
    options?: PathyFindParentOptions,
  ): Pathy | undefined {
    return Pathy.findParentPathSync(this, basename, options);
  }

  /**
   * Create a new Pathy instance that has the same path
   * as this one, guaranteed to be absolute.
   */
  toAbsolute(cwd: string | Pathy = process.cwd()) {
    return new Pathy(Pathy.ensureAbsolute(this, cwd));
  }

  /**
   * Add additional path segments (uses `path.join`).
   */
  append(...paths: string[]): Pathy {
    return new Pathy(Pathy.join(this, ...paths));
  }

  changeExtension<T>(to: string): Pathy<T>;
  changeExtension<T>(from: string[] | string, to: string): Pathy<T>;
  changeExtension(from: string[] | string, to?: string) {
    let newPath = this.absolute;
    const ensureDot = (ext: string) => (ext[0] === '.' ? ext : `.${ext}`);
    const newExtension = ensureDot(to || (from as string));
    if (to === undefined) {
      assert(
        typeof from === 'string',
        'Function signature is wrong. If only one argument is provided it must be a string.',
      );
      // Just replace the last .ext, whatever it is
      newPath = newPath.replace(/\.[^/.]+$/, newExtension);
    } else {
      const fromPattern = arrayWrapped(from).map(ensureDot).join('|');
      newPath = newPath.replace(new RegExp(`(${fromPattern})$`), newExtension);
    }
    return new Pathy(newPath, this.workingDirectory);
  }

  /**
   * Check if this path matches another path after both
   * are normalized.
   */
  equals(other: Pathy | string) {
    return Pathy.equals(this, other.toString());
  }

  /**
   * Add a file to this path, assuming it's a directory
   * (else will throw an error).
   */
  async addFileToDirectory(
    fileName: string,
    content: any,
    options?: PathyWriteOptions,
  ) {
    await this.isDirectory({ assert: true });
    const filePath = this.append(fileName);
    await filePath.write(content, options);
    return filePath;
  }

  /**
   * Get the normalized path as an array of
   * path segments.
   */
  explode(): string[] {
    return PathyStatic.explode(this);
  }

  /**
   * Get all parent paths eventually leading to a given
   * path.
   */
  lineage(): string[] {
    return PathyStatic.lineage(this);
  }

  /**
   * Serialize this Pathy instance as a plain string.
   *
   * Uses the absolute path, since that's generally
   * the safest choice.
   */
  override toString(options?: {
    format: 'win32' | 'posix';
    relative?: boolean;
  }) {
    const path = options?.relative ? this.relative : this.absolute;
    return options?.format == 'win32' ? path.replace(/\//g, '\\') : path;
  }

  /**
   * This method causes {@link Pathy} instances to automatically
   * JSON-serialize as their normalized string values.
   *
   * If the path is absolute, its cwd-relative path is returned
   * since that's usually what is desired in a JSON context.
   *
   * @example
   * const pathContainer = {
   *   title: "My path",
   *   path: new Path('/foo/bar')
   * }
   * JSON.stringify(pathContainer); // {"title":"My path","path":"/foo/bar"}
   */
  toJSON() {
    return this.toString();
  }

  /**
   * The current working directory as a Pathy instance.
   */
  static cwd() {
    return new Pathy(process.cwd());
  }

  /**
   * Convenience function for ensuring that a path is a
   * Pathy instance, useful for cases where a function
   * allows either a string or Pathy instance to be passed.
   *
   * If `stringOrInstance` is a Pathy instance, returns
   * that same instance. If it is undefined,
   * `process.cwd()` is used.
   *
   * See {@link PathyStatic.asString} for the opposite case.
   */
  static asInstance<T = unknown>(
    stringOrInstance: string | Pathy | undefined,
  ): Pathy<T> {
    if (stringOrInstance instanceof Pathy) {
      return stringOrInstance as Pathy<T>;
    }
    return new Pathy(stringOrInstance || process.cwd());
  }

  static isString(thing: any): thing is string {
    return typeof thing === 'string';
  }

  static isPathy(thing: any): thing is Pathy {
    return thing instanceof Pathy;
  }

  static isStringOrPathy(thing: any): thing is PathyOrString {
    return Pathy.isString(thing) || Pathy.isPathy(thing);
  }
}
