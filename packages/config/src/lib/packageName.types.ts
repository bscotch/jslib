import type { PackageName } from './packageName.js';

/**
 * A representation of a package name that has sufficient
 * information to construct a valid package name, and can
 * therefore be used in the `PackageName` constructor.
 */
export type PackageNameConstructable =
  | string
  | Partial<PackageNameComponents>
  | Partial<PackageNameComponentsFromPackageJson>
  | PackageName;

export interface PackageNameComponentsFromPackageJson {
  /**
   * The full package name, exactly matching the `"name"` field
   * of a corresponding `package.json` file.
   *
   * @example
   * // for '@bscotch/hello'
   * "hello"
   * // for "goodbye"
   * "goodbye"
   */
  name: string;

  /**
   * In some contexts, like in an
   * `npm install @scope/name@version` command,
   * a particular version number or tag is appended
   * to the name. This is that tag, without the
   * leading `@`.
   *
   * @example
   * // for '@bscotch/hello@latest'
   * "latest"
   */
  version?: string;
}

/**
 * The components of an npm-style Package name,
 * after parsing it. This overlaps with the fields of a
 * `package.json` file, so that the contents of said
 * file can be easily used as a base to assemble the rest.
 */
export interface PackageNameComponents
  extends PackageNameComponentsFromPackageJson {
  /**
   * The package name without the scope, if there was
   * a scope. For package names that do not contain a scope,
   * this must exactly match `name`.
   *
   * @example
   * // for '@bscotch/hello'
   * "@bscotch/hello"
   * // for "goodbye"
   * "goodbye"
   */
  unscoped: string;

  /**
   * If the package has a scope, the scope name
   * (without the leading `@`).
   *
   * @example
   * // for '@bscotch/hello'
   * "bscotch"
   */
  scope?: string;
}

export type PackageNameEqualityOperand =
  | string
  | RegExp
  | PackageName
  | PackageNameComponents;

export interface PackageNameEqualityCheckScopeOption {
  /**
   * If `true`, interpreted to mean that the *test*
   * name, if provided as a string or regex, can be
   * tested against both the full name (which may
   * have a scope) and the name without its scope.
   *
   * This is useful in local contexts where all packages
   * have a unique name independent of scope, but is
   * probably a bad idea in the general case.
   *
   * @example
   * const name = new PackageName('@bscotch/hello');
   * name.equals('hello'); // false
   * name.equals('hello', { allowMissingScope: true }); // true
   *
   * @default false
   */
  allowMissingScope?: boolean;
}

export interface PackageNameEqualityCheckOptions
  extends PackageNameEqualityCheckScopeOption {
  /**
   * By default, the equality check assumes that
   * {@link PackageNameComponents.version} values need
   * not match.
   *
   * @default false
   */
  includeVersion?: boolean;
}

/**
 * Options for how a {@link PackageName} should
 * be stringified. Uses defaults appropriate for
 * use in a `package.json` file.
 */
export interface PackageNameStringifyOptions {
  /**
   * Optionally include the tag in the stringified
   * name, e.g. for running `npm install` commands with
   * a specific version.
   */
  includeVersion?: boolean;
  /**
   * Optionally exclude the scope from the stringified
   * name, e.g. to use as a nickname for local packages
   * that have a consistent scope.
   */
  excludeScope?: boolean;
}
