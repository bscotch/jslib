import type { Promisable } from 'type-fest';
import type { DependencyVersion } from './dependencyVersion.js';
import { PackageJsonData } from './packageJson.js';

export { type PackageJson as PackageJsonData } from 'type-fest';
export type PackageJsonDependencyType =
  | 'dependencies'
  | 'devDependencies'
  | 'peerDependencies'
  | 'optionalDependencies';
export type PackageJsonDependencies = Pick<
  PackageJsonData,
  PackageJsonDependencyType
>;

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

/**
 * Search options for finding a `package.json`
 * working backwards from a starting point (moving up
 * the file tree, towards the parents).
 */
export interface PackageJsonFindOptions {
  /**
   * A file or folder to start the search from.
   *
   * @default process.cwd()
   */
  fromPath?: string;

  /**
   * Test function to run on the contents of
   * discovered `package.json` files. If provided,
   * the first `package.json` file passing the test
   * will be returned.
   *
   * @example
   * // Require that the found package.json file has a specific name
   * (pkg: PackageJsonData) => pkg.name === '@my-org/my-project';
   */
  test?: (pkg: PackageJsonData) => Promisable<any>;
}

export interface PackageJsonAddDependencyOptions {
  /**
   * Under which dependency type should this project be
   * listed?
   *
   * @default 'dependencies'
   */
  type?: PackageJsonDependencyType;

  /**
   * Dependencies can be flagged to be bundled with
   * the dependent package. Setting this to `true`
   * causes the dependency name to be listed in the
   * `bundledDependencies` array.
   *
   * @default false
   */
  bundle?: boolean;

  /**
   * Set the version of the dependency. If not provided,
   * and there is no version listed by the depdendency itself,
   * the version will be set to "latest".
   */
  version?: string | DependencyVersion;
}

export interface PackageJsonPruneDependencyOptions {
  /**
   * Any dependency listed in this array will **not** be
   * removed. Useful for the case when all actual dependencies
   * are known and you want to remove everything not in that
   * list.
   *
   * If this is an empty array, *all* dependencies will be
   * removed!
   */
  keep: string[];
}

/**
 * Information about a package.json dependency that
 * is available in a `package.json` file.
 */
export interface PackageJsonDependency {
  name: string;
  version: string;
  type: PackageJsonDependencyType;
  bundled?: boolean;
}

// /**
//  * The data structure returned by running
//  * `npm pack --json` on a package.
//  */
// export interface PackageJsonPackedSummary {
//   id: string;
//   name: string;
//   version: string;
//   size: number;
//   unpackedSize: number;
//   shasum: string;
//   integrity: string;
//   filename: string;
//   entryCount: number;
//   files: {
//     /**
//      * Relative filepath to the included file,
//      * from the package root. As of writing,
//      * these are relative POSIX-style paths without
//      * a leading `./`.
//      */
//     path: string;
//     size: number;
//     /**
//      * Not sure what this value is.
//      * @experiment
//      */
//     mode: number;
//   }[];
//   /**
//    * This doesn't seem to do anything...
//    * @experiment
//    */
//   bundled: [];
// }
