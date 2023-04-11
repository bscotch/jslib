import { Pathy, PathyOrString } from '@bscotch/pathy';
import { exec, Trace } from '@bscotch/utility';
import { assertUserClaim } from '@bscotch/validation';
import { ok } from 'assert';
import walk from 'ignore-walk';
import { default as semver, ReleaseType } from 'semver';
import sortPackageJson from 'sort-package-json';
import type { PackageJson as _PackageJsonData } from 'type-fest';
import { ConfigFile } from './configFile.js';
import { DependencyVersion } from './dependencyVersion.js';
import type {
  PackageJsonAddDependencyOptions,
  PackageJsonDependency,
  PackageJsonDependencyType,
  PackageJsonFindOptions,
  PackageJsonPruneDependencyOptions,
  PackageManager,
} from './packageJson.types.js';
import type { PackageNameConstructable } from './packageName.js';
import { PackageName } from './packageName.js';

export {
  PackageJsonAddDependencyOptions,
  PackageJsonDependency,
  PackageJsonDependencyType,
  PackageJsonFindOptions,
  PackageJsonPruneDependencyOptions,
  PackageManager,
} from './packageJson.types.js';

const trace = Trace('@bscotch');

export type PackageJsonData = _PackageJsonData & {
  packageManager?: `${PackageManager}@${string}`;
};

export type PackageJsonExtended<Extension = undefined> =
  Extension extends undefined
    ? PackageJsonData
    : Extension extends object
    ? PackageJsonData & Extension
    : never;

/**
 * A helper class for managing a `package.json` file.
 *
 * Instance with the static {@link PackageJson.load()} method.
 *
 * Note that it does not load the data until the asynchronous
 * `load()` method is called -- you'll likely encounter errors
 * if you don't do that!
 *
 */
export class PackageJson<
  Ext extends Record<string, any> = {},
> extends ConfigFile<PackageJsonExtended<Ext>> {
  protected _name: PackageName;

  /**
   * Create a hydrated instance from a `package.json` file or
   * data structure.
   *
   * To asynchronously load from a file, use {@link PackageJson.load()} instead.
   */
  constructor(options: {
    /**
     * The full path to the `package.json` file.
     * Either this or `dir` must be set.
     */
    path?: PathyOrString;
    /**
     * The path to the directory containing the
     * `package.json` file.
     * Either this or `dir` must be set.
     */
    dir?: PathyOrString;
    /**
     * The raw config data. If provided, no
     * file will be loaded from disk.
     * If not provided, will synchronously
     * load from disk.
     */
    data?: PackageJsonExtended<Ext>;
  }) {
    super({ defaultBasename: 'package.json', ...options });
    this._name = new PackageName(this.data.name!);
  }

  /**
   * The name of the packageManager listed in
   * that field, if any. Defaults to 'pnpm'.
   */
  get packageManager(): PackageManager {
    const pm = this.data.packageManager?.match(/^(p?npm|yarn)/)?.[1] as
      | PackageManager
      | undefined;
    return pm || 'pnpm';
  }

  get type(): 'module' | 'commonjs' | undefined {
    return this.data.type;
  }
  set type(moduleType: 'module' | 'commonjs' | undefined) {
    this.data.type = moduleType;
    this.data.exports ||= './index.js';
  }

  get scripts() {
    return { ...this.data.scripts };
  }

  get name(): PackageName {
    return this._name;
  }

  @trace
  async updateName(name: PackageNameConstructable) {
    await this.reload();
    this._name = new PackageName(name);
    this.data.name = name.toString();
    await this.save();
  }

  get version(): DependencyVersion | undefined {
    return typeof this.data.version == 'undefined'
      ? undefined
      : new DependencyVersion(this.data.version);
  }

  get bundledDependencies(): string[] {
    return this.data.bundledDependencies || this.data.bundleDependencies || [];
  }

  @trace
  get workspaces(): string[] {
    if (!this.data.workspaces) {
      return [];
    }
    return Array.isArray(this.data.workspaces)
      ? this.data.workspaces
      : this.data.workspaces.packages || [];
  }

  /**
   * Get *all* dependencies as one flat object, keyed
   * by dependency name, with information about its type etc.
   */
  flattenedDependencies(): Record<string, PackageJsonDependency> {
    const bundled = this.bundledDependencies;
    return PackageJson.dependencyTypes.reduce((allDeps, type) => {
      for (const [name, version] of Object.entries(this.data[type] || {})) {
        allDeps[name] = {
          name,
          version: version as string,
          type,
          bundled: bundled.includes(name),
        };
      }
      return allDeps;
    }, {} as Record<string, PackageJsonDependency>);
  }

  /**
   * The package is not publishable at all, and only lives
   * in the local workspace.
   */
  get isInternal(): boolean {
    return !!this.data.private;
  }

  /**
   * Is this package publishable at all (could
   * still be restricted)?
   *
   * The opposite of {@link PackageJson.isInternal}.
   */
  get isPublishable(): boolean {
    return !this.isInternal;
  }

  /**
   * The package is publishable to a public registry.
   */
  get isPublic(): boolean {
    return !this.isInternal && this.data.publishConfig?.access === 'public';
  }

  /**
   * The package is publishable to a private registry.
   */
  get isRestricted(): boolean {
    return !this.isInternal && this.data.publishConfig?.access === 'restricted';
  }

  /**
   * The array of globs listed in the `files` field.
   * If that value is not set in the config, this returns
   * the spec default.
   *
   * See {@link https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files the docs}.
   *
   * @default ['*']
   */
  get files() {
    return [...(this.data.files || ['*'])];
  }

  /**
   * Run a command via the package manager.
   * The args list should be whatever follows
   * the package manager name.
   *
   * @example
   * // for command: `pnpm install`
   * pkg.run(['install']);
   * // for command: `npm run build`
   * pkg.run(['run', 'build']);
   */
  async execute(args: string[]): Promise<{ stdout: string; stderr: string }> {
    const out = await exec(this.packageManager, args, {
      cwd: this.dir.absolute,
      shell: true,
    });
    if (out.code) {
      console.error(out);
      throw new Error(
        `Failed to run "${this.packageManager} ${args.join(' ')}"`,
      );
    }
    return out;
  }

  async test(args: string[] = []) {
    await this.execute(['run', 'test', ...args]);
  }

  async publish(options?: { dryRun?: boolean }) {
    ok(this.isPublishable, `Project ${this.name} is not publishable`);
    // Publish
    const publishOptions = ['publish'];
    if (this.packageManager === 'yarn') {
      publishOptions.unshift('npm');
    }
    if (this.isPublic) {
      publishOptions.push('--access', 'public');
    }
    if (options?.dryRun) {
      publishOptions.push('--dry-run');
    }
    await this.execute(publishOptions);
  }

  /**
   * Bump the version of this package. Must
   * be a valid semver bumptype, or a specific
   * semver version that is greater than the
   * current one.
   *
   * Returns the new version.
   */
  async bumpVersion(
    version: string | ReleaseType,
    prereleaseIdentifier?: string,
  ): Promise<string> {
    const specificVersion = semver.valid(version);
    if (specificVersion) {
      assertUserClaim(
        semver.gt(specificVersion, this.data.version!),
        `Version ${specificVersion} is not greater than ${this.version}`,
      );
      this.data.version = specificVersion;
    } else {
      assertUserClaim(
        [
          'major',
          'premajor',
          'minor',
          'preminor',
          'patch',
          'prepatch',
          'prerelease',
        ].includes(version),
        `Invalid bump type ${version}`,
      );
      const nextVersion = semver.inc(
        this.data.version!,
        version as ReleaseType,
        prereleaseIdentifier,
      );
      if (!this.version || !nextVersion) {
        console.log(this.path.absolute);
      }
      assertUserClaim(
        nextVersion,
        `Failed to bump version from ${this.version} to ${nextVersion}`,
      );
      this.data.version = nextVersion;
    }
    await this.save();
    return this.data.version;
  }

  /**
   * List all files that would be included if this
   * package were published to a registry. Uses the
   * [npm-packlist](https://www.npmjs.com/package/npm-packlist)
   * module, which is what npm uses for `npm pack`.
   *
   * See {@link https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files the docs}.
   */
  async packingList(): Promise<Pathy[]> {
    const list = await walk({
      path: this.dir.toString(),
    });
    return list.map((path) => new Pathy(path, this.dir.absolute));
  }

  /**
   * If a given dependency found in this `package.json` file
   * is local (uses a `file:` version), return that dependency's
   * hydrated `package.json`.
   */
  async loadIfLocalDependency(depName: string | PackageName) {
    const version = this.findDependency(depName)?.version;
    if (!version || !version.localPath) {
      this.trace('loadingIfLocalDependency: %s is not local', depName);
      return;
    }
    this.trace(
      `loadingIfLocalDependency: %s is local, at path ${version.localPath}`,
    );
    return await PackageJson.load(this.dir.resolveTo(version.localPath));
  }

  /**
   * Get the version of a dependency, checking in all dependency types.
   */
  @trace
  findDependency(
    name: string | PackageName,
  ):
    | { version: DependencyVersion; type: PackageJsonDependencyType }
    | undefined {
    const foundInType = PackageJson.dependencyTypes.find((type) => {
      return this.data[type]?.[name.toString()];
    });
    const versionString =
      foundInType && this.data[foundInType]?.[name.toString()];
    const version =
      typeof versionString === 'undefined'
        ? versionString
        : { version: new DependencyVersion(versionString), type: foundInType! };
    return version;
  }

  async syncDependencyVersions(sourceOfTruth: PackageJson) {
    const trueDeps = sourceOfTruth.flattenedDependencies();
    for (const trueDepName of Object.keys(trueDeps)) {
      const trueDep = trueDeps[trueDepName];
      if (DependencyVersion.inferType(trueDep.version) === 'local') {
        continue;
      }
      const sourceDep = this.findDependency(trueDepName);
      if (sourceDep && sourceDep.version.toString() !== trueDep.version) {
        await this.addDependency(trueDepName, {
          version: trueDep.version,
          type: sourceDep.type,
        });
      }
    }
    await this.save();
  }

  /**
   * Add a dependency to this package, or update an existing dependency
   * to a different version or type, while minimizing the chance of
   * clobbering changes on disk.
   *
   * This method does nothing if the in-memory dependencies already
   * match the provided one. Otherwise it freshly loads the file
   * from disk, updates that file, and then immediately writes it
   * back.
   *
   * Returns a string indicating what change was made, if any.
   */
  async addDependency(
    dep: PackageNameConstructable | PackageJson | PackageJsonExtended,
    options?: PackageJsonAddDependencyOptions,
  ): Promise<'updated' | 'added' | undefined> {
    const name = dep instanceof PackageJson ? dep.name : new PackageName(dep);
    let changeType: 'updated' | 'added' = 'added';

    const currentVersion = this.findDependency(name);
    const targetVersion =
      options?.version?.toString() || name.version || 'latest';
    const targetType = options?.type || 'dependencies';
    if (currentVersion) {
      changeType = 'updated';
    }

    if (
      currentVersion?.version?.equals(targetVersion) &&
      currentVersion.type === targetType
    ) {
      // No change!
      return;
    }

    // Load fresh from disk.
    await this.reload();

    // Remove the dependency from all deps fields
    // to prevent duplicating across deptypes
    for (const depType of PackageJson.dependencyTypes) {
      delete this.data[depType]?.[name.toString()];
    }

    // Add it to the appropriate deptype
    this.data[targetType] ||= {};
    this.data[targetType]![name.toString()] = targetVersion;

    // Save it back to disk immediately to minimize chance of
    // clobbering changes created by other processes.
    this.trace(
      "%s dependency '%s' version '%s' in '%s'",
      changeType,
      name,
      targetVersion,
      this.dir.relative,
    );
    await this.save();
    return changeType;
  }

  async renameDependency(
    oldName: PackageNameConstructable,
    newName: PackageNameConstructable,
  ): Promise<any> {
    const fromName = new PackageName(oldName);
    const depInfo = this.findDependency(fromName);
    if (!depInfo) {
      this.trace(`renameDependency: ${oldName} is not a dependency`);
      return;
    }
    // Update the package.json
    await this.deleteDependency(fromName);
    return await this.addDependency(newName, depInfo);
  }

  /**
   * Install a dependency with `npm install`. If the dependency
   * is a `PackageJson` instance, it will be installed with the `file:`
   * protocol instead of a specific version.
   */
  @trace
  async install(dep: PackageJson | string) {
    const isLocal = dep instanceof PackageJson;
    const args = [
      'install',
      isLocal ? `./${this.dir.relativeTo(dep.dir)}` : dep,
    ];
    const opts = { cwd: this.dir.absolute };
    this.trace(`running %o: ${this.packageManager} ${args.join(' ')}`, opts);
    await exec(this.packageManager, args, opts);
  }

  /**
   * Remove unneeded dependencies from this packageJson.
   *
   * Like with {@link addDependency}, this method does nothing
   * if no pruning is necessary and otherwise freshly loads and
   * immediately saves the target file to minimize clobbering risk.
   */
  async pruneDependencies(options: PackageJsonPruneDependencyOptions) {
    const keep = new Set(options.keep);
    const keepPrefixes = options.keep
      .filter((n) => n.endsWith('*'))
      .map((n) => n.slice(0, -1));
    const allDeps = this.flattenedDependencies();
    const allDepsNames = Object.keys(allDeps);
    const removeNames = allDepsNames.filter(
      (name) =>
        !keep.has(name) && !keepPrefixes.some((p) => name.startsWith(p)),
    );
    if (removeNames.length === 0) {
      return;
    }
    await this.reload();
    for (const removeName of removeNames) {
      Reflect.deleteProperty(this.data[allDeps[removeName].type]!, removeName);
      console.log("Pruned dependency '%s'", removeName);
    }
    return await this.save();
  }

  async deleteDependency(name: PackageNameConstructable) {
    name = new PackageName(name);
    await this.reload();
    for (const depType of PackageJson.dependencyTypes) {
      if (!this.data[depType]) {
        continue;
      }
      Reflect.deleteProperty(this.data[depType]!, name.toString());
    }
    await this.save();
  }

  /**
   * Check if this package is allowed to depend on another,
   * based on compatibility with private/publishable and
   * public/restricted states.
   *
   * - If current package is internal, it can depend on any other package.
   * - If current package is public, it can only depend on public packages.
   * - If current package is restricted, it can only depend on restricted or public packages.
   */
  canDependOn(otherPackageJson: PackageJson): boolean {
    return (
      this.isInternal ||
      otherPackageJson.isPublic ||
      (this.isRestricted && otherPackageJson.isPublishable)
    );
  }

  populateDefaults() {
    this.data.types ||= 'index.d.ts';
    this.data.main ||= 'index.js';

    // Publishing
    if (!this.data.publishConfig) {
      this.data.private = true;
      this.data.license = 'UNLICENSED';
    } else {
      this.data.publishConfig.access ||= 'restricted';
      this.data.private = undefined;
      if (this.data.publishConfig.access === 'public') {
        this.data.license = 'MIT';
      } else {
        this.data.license = 'UNLICENSED';
      }
    }
    // Module type
    this.type ||= 'module';

    return this;
  }

  override async save(): Promise<this> {
    this.data = sortPackageJson(this.data);
    return await super.save();
  }

  static get dependencyTypes(): PackageJsonDependencyType[] {
    return [
      'dependencies',
      'peerDependencies',
      'devDependencies',
      'optionalDependencies',
    ];
  }

  /**
   * Load a `package.json` file as an instance.
   */
  @trace
  static async load(pathOrDir: PathyOrString): Promise<PackageJson> {
    const path =
      Pathy.basename(pathOrDir) === 'package.json'
        ? pathOrDir
        : Pathy.join(pathOrDir, 'package.json');
    ok(
      await Pathy.exists(path),
      `Cannot load package.json: ${path} does not exist`,
    );
    const data = await Pathy.read<PackageJsonData>(path);
    const pkg = new PackageJson({ path, data });
    return pkg as any;
  }

  static async createPackage(
    inDir: PathyOrString,
    options: PackageJsonData = {},
  ) {
    options.name ||= Pathy.basename(inDir);
    options.version ||= '0.1.0';
    const pkg = new PackageJson({ data: options, dir: inDir });
    return await pkg.save();
  }

  /**
   * Find the nearest `package.json` file, starting from
   * some path and searching up the tree (towards the
   * file system root).
   *
   * The project root is defined as the nearest parent directory
   * (including the starting directory) that has a `package.json`
   * file matching any additional filter criteria.
   *
   * @returns {Pathy} The root directory of the project.
   */
  @trace
  static async findPackageJson<Ext extends Record<string, any> = {}>(
    options?: PackageJsonFindOptions,
  ): Promise<PackageJson<Ext>> {
    const fromPath = Pathy.asInstance(options?.fromPath || process.cwd());
    const nearestPkg = await fromPath.findInParents('package.json', {
      test: async (foundPath: Pathy) => {
        return options?.test
          ? await options.test(await foundPath.read())
          : true;
      },
    });
    ok(nearestPkg, 'Could not find a root package.json file.');
    return new PackageJson<Ext>({
      dir: nearestPkg.directory,
      data: await nearestPkg.read(),
    });
  }
}
