import { ok } from 'assert';
import { Trace, TracedClass } from '@bscotch/utility';
import type {
  PackageNameComponents,
  PackageNameConstructable,
  PackageNameEqualityCheckOptions,
  PackageNameEqualityOperand,
  PackageNameStringifyOptions,
} from './packageName.types.js';

export {
  PackageNameComponents,
  PackageNameConstructable,
  PackageNameEqualityCheckOptions,
  PackageNameEqualityOperand,
  PackageNameStringifyOptions,
} from './packageName.types.js';

export interface PackageName extends TracedClass {}

/**
 * A helper class for managing a package name
 * according to npm naming conventions.
 */
@Trace('@bscotch')
export class PackageName {
  protected _components: PackageNameComponents;

  constructor(name: PackageNameConstructable) {
    const nameString =
      typeof name === 'string'
        ? name
        : PackageName.stringify(name, {
            excludeScope: false,
            excludeVersion: false,
          });
    this._components = PackageName.parse(nameString);
  }

  /**
   * This package name, brasserten into its semantic components.
   */
  get components(): PackageNameComponents {
    return this._components;
  }

  /**
   * See {@link PackageNameComponents.name}
   */
  get name(): string {
    return this.components.name;
  }

  /**
   * See {@link PackageNameComponents.unscoped}
   */
  get unscoped(): string {
    return this.components.unscoped;
  }

  /**
   * See {@link PackageNameComponents.scope}
   */
  get scope(): string | undefined {
    return this.components.scope;
  }

  /**
   * See {@link PackageNameComponents.version}
   */
  get version(): string | undefined {
    return this.components.version;
  }

  /**
   * Check if this {@link PackageName} is a match
   * for another package's name or a pattern, with
   * options to control fuzziness.
   */
  equals(
    otherPackageName: PackageNameEqualityOperand,
    options?: PackageNameEqualityCheckOptions,
  ) {
    // Narrow to RegExp or PackageName instance
    otherPackageName =
      otherPackageName instanceof RegExp ||
      otherPackageName instanceof PackageName
        ? otherPackageName
        : new PackageName(otherPackageName);
    const baseStringifyOpts = { includeVersion: options?.includeVersion };
    const serializeOptions: PackageNameStringifyOptions[] = [baseStringifyOpts];
    if (options?.allowMissingScope) {
      // Then we'll test against the name alone
      serializeOptions.push({ ...baseStringifyOpts, excludeScope: true });
    }
    return serializeOptions.some((opts) => {
      const thisNameAsString = this.toString(opts);
      if (otherPackageName instanceof RegExp) {
        const isMatch = otherPackageName.test(thisNameAsString);
        this.trace(
          `Comparing ${thisNameAsString} to ${otherPackageName}; same? ${isMatch}`,
        );
        return isMatch;
      }
      // Otherwise need to test against the other *with*
      // its scope, if it has one, since the `anyScope`
      // option only applies to scope-undefined test names.
      const otherNameAsString = otherPackageName.toString(baseStringifyOpts);
      return thisNameAsString === otherNameAsString;
    });
  }

  /**
   * Override of the general `Object.prototype.toString()`
   * method, causing an instance of this class to be stringified
   * as a valid package name string. Defaults to leaving off
   * the version, since that's not technically part of the name.
   *
   * @example
   * const name = new PackageName('@scope/name');
   * `${name}@latest`; // '@scope/name@latest'
   */
  toString(options?: PackageNameStringifyOptions) {
    return PackageName.stringify(this.components, {
      excludeVersion: !options?.includeVersion,
      excludeScope: options?.excludeScope,
    });
  }

  /**
   * Method that will be used by built-in `JSON.stringify()`,
   * causing this class to be serialized as a valid package name string
   * in JSON contexts.
   *
   * @example
   * const someData = {field:'value', name: new PackageName('@scope/name')};
   * JSON.stringify(someData); // '{"field":"value","name":"@scope/name"}'
   */
  toJSON() {
    return this.toString();
  }

  /**
   * Serialize the package name to a string,
   * with multiple options on which components are
   * included for different use cases. Can be used
   * to get a normalized string from a variety of input types.
   *
   * @example
   * const parts = { scope: 'bscotch', name: 'hello', version: '1.0.0' };
   */
  static stringify(
    components: PackageNameConstructable,
    options?: { excludeVersion?: boolean; excludeScope?: boolean },
  ): string {
    if (typeof components === 'string') {
      components = PackageName.parse(components);
    } else if (!(components instanceof PackageName)) {
      // Then we could have incompatible/invalid fields.
      // Populate missing values and ensure nothing weird.
      components = PackageName.normalizedComponents(components);
    }
    const { name, unscoped, version } = components as
      | PackageNameComponents
      | PackageName;
    let stringified = options?.excludeScope ? unscoped : name;
    if (version && !options?.excludeVersion) {
      stringified += `@${version}`;
    }
    return stringified;
  }

  /**
   * Given a name components object, ensure that it is valid
   * and populate any missing fields. If any fields are in conflict,
   * throws an error.
   *
   * Returns a *new*, valid components object (does not mutate the original).
   */
  static normalizedComponents(
    rawComponents: Partial<PackageNameComponents>,
  ): PackageNameComponents {
    let normalized: PackageNameComponents;
    if (rawComponents.name) {
      // Get the parts right out of the string.
      normalized = PackageName.parse(rawComponents.name);
      normalized.version ||= rawComponents.version;
      for (const field of ['unscoped', 'scope', 'version'] as const) {
        ok(
          typeof rawComponents[field] === 'undefined' ||
            rawComponents[field] == normalized[field],
          `Conflict in '${field}' between original (${rawComponents[field]}) and parsed (${normalized[field]})`,
        );
      }
    } else {
      // We need to construct the name from the other parts.
      ok(
        rawComponents.unscoped,
        `Cannot create a valid name without either "name" or "unscoped"`,
      );
      const name = rawComponents.scope
        ? `@${rawComponents.scope}/${rawComponents.unscoped}`
        : rawComponents.unscoped;
      normalized = PackageName.parse(
        rawComponents.version ? `${name}@${rawComponents.version}` : name,
      );
    }
    return normalized;
  }

  /**
   * Parse a package name into its components.
   *
   * @example
   * PackageJson.parse('@bscotch/hello@latest');
   * // { name: '@bscotch/hello', scope: 'bscotch', unscoped: 'hello', version: 'latest' }
   *
   * @example
   * PackageJson.parse('hello');
   * // { name: 'hello', unscoped: 'hello' }
   */
  static parse(name: string): PackageNameComponents {
    const match = name.match(
      /^(@(?<scope>[a-z0-9-_]+)\/)?(?<unscoped>[a-z0-9-_.]+)(@(?<version>[a-z0-9._-]+))?$/,
    );
    ok(match, `Invalid package name: ${name}`);
    const { scope, unscoped, version } = match.groups!;
    return {
      name: scope ? `@${scope}/${unscoped}` : unscoped,
      scope,
      unscoped,
      version,
    };
  }
}
