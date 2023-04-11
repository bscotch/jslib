import type { PackageJson, PackageJsonData } from '@bscotch/config';
import type { Pathy } from '@bscotch/pathy';
import { PathyOrString } from '@bscotch/pathy';
import type { Promisable } from 'type-fest';
import type { Project } from './project.js';

export interface ProjectOptions {
  dir?: string | Pathy;
  packageJson?: PackageJson;
  /**
   * The names of other projects sharing
   * a workspace with this one. Used for
   * resolving dependencies.
   */
  workspaceProjects?: Project[];
}

/**
 * Search options for finding a {@link Package}
 * working backwards from a starting point.
 */
export interface ProjectRootSearchOptions {
  /**
   * A file or folder within the project, from
   * which to start searching parent directories
   * for the root.
   *
   * @default process.cwd()
   */
  fromPath?: string;

  /**
   * Test function to run on the contents of
   * discovered `package.json` files. The directory
   * containing the `package.json` file will only
   * be returned as the "root" if the test function
   * is either not present or returns a truthy value.
   *
   * @example
   * // Require that the found package.json file has a specific name
   * (pkg: PackageJsonData) => pkg.name === '@my-org/my-project';
   */
  test?: (pkg: PackageJsonData) => Promisable<any>;
}

/**
 * Options for running a build of a project.
 */
export interface ProjectBuildOptions {
  /**
   * Local packages that might be imported by this project.
   *
   * If any imports match the name of a package in this array,
   * the matching `PackageJson` instance will be used to
   * determine the appropriate version to specify.
   */
  localPackages?: Project[];

  /**
   * Some dependencies may not be discoverable by
   * the automated import-parsing process. Typescript's
   * `tslib` is a good example of this. The project
   * builder purges any dependencies that it does not
   * find references to, so you'll need to specify any
   * dependencies that should *not* be deleted.
   *
   * You can specify any such dependencies here.
   *
   * Note that `tslib` is always included if the
   * project's `tsconfig` includes the compiler option
   * `importHelpers:true`.
   */
  protectFromPruning?: string[];

  /**
   * If true, the compile step will run in watch mode.
   * Other build steps will not be run in this mode,
   * since they normally occur after the compile step.
   */
  watch?: boolean;
}

export interface ProjectUpdateDepOptions extends ProjectBuildOptions {
  /**
   * If this dependency is only used for types
   */
  isTypeOnly?: boolean;
}

export interface ProjectCreateOptions {
  /**
   * The directory to create the project in
   */
  dir: string;
  /**
   * The npm-style package name.
   */
  name: string;
  /**
   * The initial version of the new project. Must be a valid semver string
   */
  version?: string;
  /**
   * Output folder for built files
   */
  outDir?: string;
  /**
   * Source folder for Typescript (unbuilt) files
   */
  srcDir?: string;
  /**
   * Path to a tsconfig.json file to use as basis for this project's tsconfig.json
   */
  extendsTsconfigPath?: PathyOrString;
  /**
   * Instead of writing anything to disk, write
   * details to stdout.
   */
  dryRun?: boolean;
}

export interface ProjectExtractOptions extends ProjectCreateOptions {
  /**
   * List of entrypoints to extract from the project. Folder entrypoints will cause all children to be extracted, while file entrypoints will cause all prefix-matching siblings to be extracted.
   */
  entrypoints: string[];
}

export interface ProjectFixOptions {
  // removeUnusedIdentifiers?: boolean;
  addMissingImports?: boolean;
  /**
   * Ensure import/export paths are fully-resolved paths.
   * Resolves path aliases and ensures file extensions.
   */
  resolveModulePaths?: boolean;
  organizeImports?: boolean;
  /**
   * Infer details of the project's dependencies
   * from its code, and sync those with the package.json
   * file.
   */
  packageJson?: boolean;
  // /**
  //  * If true, files with infixes (e.g. `file.infix.ts`) are only allowed to be imported by files with the same pre-infix basename (e.g. `file.test.ts` can import `file.ts` or `file.infix.ts`, and `otherfile.ts` can import from `file.ts` but not `file.infix.ts`). This helps to keep clean APIs while allowing automation of file management.
  //  */
  // enforceInfixPatternEntrypoint?: boolean;
}

export interface ProjectMoveOptions {
  /**
   * The new project root directory.
   */
  to: string;
}

export interface ProjectMoveFilesOptions {
  /**
   * The regex pattern to use to identify files to rename. Tested against each filepath in the project, where that filepath is relative to the project root and does not have a "./" prefix.
   */
  match: string;
  /**
   * The new name for matching files. Uses JavaScript's `String.replace()` function, so you can reference capture groups from your match pattern.
   */
  rename: string;
  /**
   * Do not actually rename files. Stdout will show the rename operations as if they occurred.
   */
  dryRun?: boolean;
}

export interface ProjectRenameOptions {
  /**
   * The new package name.
   */
  name: string;
}

export interface ProjectTestOptions {
  /**
   * Propagate uncaught errors?
   */
  allowUncaught?: boolean;
  /**
   * Force `done` callback or promise?
   */
  asyncOnly?: boolean;
  /**
   * bail on the first test failure.
   */
  bail?: boolean;
  /**
   * Check for global variable leaks?
   */
  checkLeaks?: boolean;
  /**
   * Color TTY output from reporter
   */
  color?: boolean;
  /**
   * Delay root suite execution?
   */
  delay?: boolean;
  /**
   * Show diff on failure?
   */
  diff?: boolean;
  /**
   * Report tests without running them?
   */
  dryRun?: boolean;
  /**
   * Test filter given string.
   */
  fgrep?: string;
  /**
   * Tests marked `only` fail the suite?
   */
  forbidOnly?: boolean;
  /**
   * Pending tests fail the suite?
   */
  forbidPending?: boolean;
  /**
   * Full stacktrace upon failure?
   */
  fullTrace?: boolean;
  /**
   * Display inline diffs?
   */
  inlineDiffs?: boolean;
  /**
   * Invert test filter matches?
   */
  invert?: boolean;
  /**
   * Disable syntax highlighting?
   */
  noHighlighting?: boolean;
  /**
   * Number of times to retry failed tests.
   */
  retries?: number;
  /**
   * Slow threshold value.
   */
  slow?: number;
  /**
   * Timeout threshold value.
   */
  timeout?: number;
  /**
   * Run jobs in parallel
   */
  parallel?: boolean;
  /**
   * Max number of worker processes for parallel runs.
   */
  jobs?: number;
}
