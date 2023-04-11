import {
  PackageJson,
  TsConfig,
  type DependencyVersion,
  type PackageJsonDependencyType,
  type PackageJsonFindOptions,
  type PackageName,
  type PackageNameConstructable,
} from '@bscotch/config';
import { Pathy } from '@bscotch/pathy';
import {
  memoize,
  Trace,
  type MemoizedClass,
  type TracedClass,
} from '@bscotch/utility';
import { move } from 'fs-extra';
import { MochaOptions } from 'mocha';
import { basename, dirname } from 'path';
import simpleGit, { SimpleGit } from 'simple-git';
import { Project as Morpher } from 'ts-morph';
import { createNewProject } from './project.create.js';
import {
  inferProjectDependencies,
  normalizeExtension,
  ProjectDependencies,
  renameProjectDependency,
  updateProjectDependencyListing,
  updateProjectDependencyListings,
} from './project.deps.js';
import {
  extractProject,
  splitImportDeclarationAfterExtraction,
} from './project.extract.js';
import { fixProjectSourceFiles } from './project.fix.js';
import { inferEntrypoints } from './project.graph.js';
import { moveProjectFiles } from './project.moveFiles.js';
import { runProjectTestsWithMocha } from './project.testing.js';
import type {
  ProjectBuildOptions,
  ProjectCreateOptions,
  ProjectExtractOptions,
  ProjectFixOptions,
  ProjectOptions,
  ProjectUpdateDepOptions,
} from './project.types.js';

export * from './project.schemas.js';
export * from './project.types.js';

export interface Project extends TracedClass, MemoizedClass {}

const trace = Trace('@bscotch');

interface PackageJsonExtension {
  trebuchet?: {
    keep?: {
      [DepType in 'dependencies' | 'devDependencies']?: string[];
    };
  };
}

/**
 * The {@link Project} class represents a node-style project
 * (one that uses a `package.json` file) in plain JavaScript or
 * Typescript.
 */
@trace
@memoize
export class Project<P extends Record<string, any> = PackageJsonExtension> {
  protected _dir!: Pathy;
  protected _git?: SimpleGit;
  protected _packageJson!: PackageJson<P>;
  protected _options?: ProjectOptions;

  constructor(options?: ProjectOptions) {
    this.init(options);
  }

  @trace
  protected init(options?: ProjectOptions) {
    this._options = options;
    this._dir = Pathy.asInstance(options?.dir);
    this._packageJson = (options?.packageJson ||
      new PackageJson({ dir: this.dir })) as PackageJson<P>;
  }

  get options(): Readonly<ProjectOptions | undefined> {
    return this._options;
  }

  get dir() {
    return this._dir;
  }

  get packageJson() {
    return this._packageJson;
  }

  get workspaceProjects(): Project[] {
    return this.options?.workspaceProjects || [];
  }

  get name(): PackageName {
    return this.packageJson.name;
  }

  get version(): DependencyVersion | undefined {
    return this.packageJson.version;
  }

  get git() {
    if (!this._git) {
      this._git = simpleGit(this.dir.absolute);
    }
    return this._git;
  }

  async srcDir() {
    return await (await this.tsconfig()).srcDir();
  }

  async outDir() {
    return await (await this.tsconfig()).outDir();
  }

  /**
   * The scripts defined in the project's package.json
   */
  get scripts() {
    return this.packageJson.scripts;
  }

  /**
   * Change the name of this project, which
   * will update the `package.json` file
   * appropriate.
   *
   * @returns - The *old* name of the project.
   */
  @trace
  async changeName(name: PackageNameConstructable) {
    const oldName = this.name;
    await this.packageJson.updateName(name);
    return oldName;
  }

  /**
   * Move this project to another location on disk.
   * Moves *all* files, including any npm/gitignored ones.
   */
  @trace
  async move(where: Pathy) {
    const currentLocation = this.dir;
    this.trace(
      `moving project ${this.name} from ${currentLocation} to ${where}`,
    );
    await move(currentLocation.absolute, where.absolute, {
      overwrite: false,
    });
    // Entirely clear all memoized stuff
    this.clearMemoized();
    this.init({ ...this._options, dir: where, packageJson: undefined });
  }

  @memoize
  async tsconfig() {
    return await TsConfig.resolve(this.dir);
  }

  @memoize
  async compilerOptions() {
    return (await this.tsconfig()).compilerOptions();
  }

  /**
   * Get the list of all files found in this project's
   * directory that are tracked by git. Returned paths
   * are relative to the project's directory (which may
   * not be the same as the git root).
   *
   * Descendent directories that include a `package.json`
   * are excluded.
   */
  async listTrackedFiles() {
    const files = (await this.git.raw(['ls-files'])).trim().split(/[\r\n]+/g);
    const nestedPackages = files
      .filter((f) => basename(f) === 'package.json' && f !== 'package.json')
      .map((f) => dirname(f));
    return files.filter((f) => {
      for (const pkg of nestedPackages) {
        if (Pathy.isParentOf(pkg, f)) {
          return false;
        }
      }
      return true;
    });
  }

  /**
   * Remove built files that don't have a corresponding
   * source file. Useful to ensure that tests
   * are only running against content from the source,
   * and that old files won't be accidentally
   * deployed.
   */
  async pruneCompiled() {
    const [srcDir, outDir] = await Promise.all([this.srcDir(), this.outDir()]);
    const srcFiles = new Set<string>();
    await srcDir.listChildrenRecursively({
      onInclude(path) {
        const normalized = normalizeExtension(path.relativeFrom(srcDir), 'js');
        srcFiles.add(normalized);
      },
    });
    await outDir.listChildrenRecursively({
      async onInclude(path) {
        const normalized = normalizeExtension(path.relativeFrom(outDir), 'js');
        if (!srcFiles.has(normalized)) {
          await path.delete();
        }
      },
    });
  }

  /**
   * Create a `ts-morph` instance for the local project,
   * for use in codemods and other features.
   */
  @memoize
  async codeMorpher() {
    const config = await this.tsconfig();
    const tsc = new Morpher({
      skipFileDependencyResolution: true,
      tsConfigFilePath: config.path.toString(),
    });
    const configs = await config.resolveProjectReferenceTree();
    configs
      .slice(1)
      .forEach((c) => tsc.addSourceFilesFromTsConfig(c.path.toString()));
    return tsc;
  }

  /**
   * Move (rename) source files, with automatic
   * updates to import statements across the project.
   *
   * See {@link moveProjectFiles}
   */
  async moveFiles(options: {
    match: RegExp;
    rename: string;
    dryRun?: boolean;
  }): Promise<[from: string, to: string][]> {
    return await moveProjectFiles(
      this as Project<PackageJsonExtension>,
      options,
    );
  }

  /**
   * Fix auto-fixable issues in source files.
   *
   * See {@link fixProjectSourceFiles}
   */
  async fixSourceFiles(options: ProjectFixOptions) {
    await fixProjectSourceFiles(this as Project<PackageJsonExtension>, options);
  }

  /**
   * Run any tests found in the project.
   *
   * See {@link runProjectTestsWithMocha}
   */
  async test(options?: MochaOptions) {
    await runProjectTestsWithMocha(
      this as Project<PackageJsonExtension>,
      options,
    );
  }

  /**
   * Change the name of a dependency used
   * by this project.
   *
   * See {@link renameProjectDependency}
   */
  async renameDependency(
    oldName: PackageNameConstructable,
    newName: PackageNameConstructable,
    options?: { onlyPackageJson?: boolean },
  ): Promise<any> {
    return await renameProjectDependency(
      this as Project<PackageJsonExtension>,
      oldName,
      newName,
      options,
    );
  }

  /**
   * Find all non-Node, non-project-internal dependencies
   * in this project from the Typescript source.
   *
   * See {@link inferProjectDependencies}
   */
  @trace
  async inferDependencies(): Promise<ProjectDependencies> {
    return await inferProjectDependencies(
      this as Project<PackageJsonExtension>,
    );
  }

  /**
   * Make sure that all dependencies are listed in the appropriate
   * `package.json` files.
   *
   * See {@link updateProjectDependencyListings}
   */
  async updateDependencyListings(options?: ProjectBuildOptions): Promise<void> {
    return await updateProjectDependencyListings(
      this as Project<PackageJsonExtension>,
      options,
    );
  }

  /**
   * Find the version that this dependency should be listed as,
   * and ensure that's true in all appropriate files (if possible).
   *
   * See {@link updateProjectDependencyListing}
   */
  async updateDependencyListing(
    dep: string,
    depType: PackageJsonDependencyType,
    options: ProjectUpdateDepOptions | undefined,
  ): Promise<'updated' | 'added' | undefined> {
    return await updateProjectDependencyListing(
      this as Project<PackageJsonExtension>,
      dep,
      depType,
      options,
    );
  }

  /**
   * List all source files found in the project,
   * using Typescript and your TSConfig files to
   * identify source files.
   */
  @memoize
  async listSourceFiles() {
    const morpher = await this.codeMorpher();
    const files = morpher.getSourceFiles();
    return files;
  }

  /**
   * Purge built files, associated .tsbuildinfo
   * files, caches, etc.
   */
  async clean() {
    const deleteWaits: Promise<any>[] = [];
    const outDir = await this.outDir();
    const deletedMiscellany = this.dir.listChildrenRecursively({
      includePatterns: [/\.tsbuildinfo$/],
      onInclude(path) {
        deleteWaits.push(path.delete());
      },
    });
    deleteWaits.push(
      deletedMiscellany,
      outDir.delete({ recursive: true }),
      this.dir.join('.turbo').delete({ recursive: true }),
    );
    await Promise.all(deleteWaits);
  }

  /**
   * Find likely entrypoints for project
   * sub-components. Returns source files
   * that do not contain infixes.
   */
  @memoize
  async listEntrypoints() {
    return await inferEntrypoints(this);
  }

  async extractProject(options: ProjectExtractOptions) {
    return await extractProject(this, options);
  }

  async changeImportTokensToDifferentModule(
    originalModuleName: string,
    newModuleName: string,
    tokenNames: Set<string>,
    options?: { dryRun?: boolean },
  ) {
    await splitImportDeclarationAfterExtraction(
      this as Project<PackageJsonExtension>,
      originalModuleName,
      newModuleName,
      tokenNames,
      options,
    );
  }

  /**
   * Check if this instance corresponds to
   * the same project of another instance.
   *
   * Note that this does not mean that the
   * other details of the instances are the
   * same. They could be out of sync, have
   * different cached values, etc.
   */
  equals(otherProject: Project) {
    return this.dir.equals(otherProject.dir);
  }

  /**
   * Find a project, starting from
   * some path within it, and create a corresponding
   * {@link Project} instance.
   */
  @trace
  static async findProject(options?: PackageJsonFindOptions): Promise<Project> {
    const pkg = await PackageJson.findPackageJson(options);
    return new Project({ dir: pkg.dir, packageJson: pkg });
  }

  static async createProject(projectInfo: ProjectCreateOptions) {
    return await createNewProject(projectInfo);
  }
}
