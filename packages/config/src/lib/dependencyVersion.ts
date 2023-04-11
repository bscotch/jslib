import { Pathy } from '@bscotch/pathy';
import { default as semver } from 'semver';

export type DependencyVersionType =
  | 'url'
  | 'tag'
  | 'semver'
  | 'range'
  | 'local'
  | 'github'
  | 'git';

/**
 * A helper class for parsing/creating an npm-style dependency
 * "version". These are a bit complex, because dependencies are
 * stored as
 * `{"dependencies": {"dep-name": "version-and-rules-or-location"}}`
 * fields.
 *
 * This class currently implements the following "version" styles:
 *
 * - Semver range patterns, e.g. `^1.0.0`, `~1.0.0`, `>=1.0.0`, `1.0.x`
 * - Tags, e.g. `latest`, `dev`
 * - Tarball URLs
 * - Git URLs, e.g. using protocol git, git+ssh, git+http, git+https, or git+file
 * - GitHub repos, e.g. `bscotch/dope-package`
 * - Local paths, e.g. `file:./path/to/file`
 *
 * See npm's [package.json docs](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#dependencies)
 * for all of the details.
 */
export class DependencyVersion {
  readonly type: DependencyVersionType;

  constructor(readonly version: string) {
    this.type = DependencyVersion.inferType(version);
  }

  /**
   * If this is a local dependency, the path to the
   * dependency root as a {@link Pathy} instance.
   * Otherwise returns `undefined`.
   */
  get localPath(): string | undefined {
    return this.type === 'local'
      ? new Pathy(this.version.replace(/^file:/, '')).normalized
      : undefined;
  }

  equals(other: string | DependencyVersion | undefined) {
    if (typeof other != 'string' && !(other instanceof DependencyVersion)) {
      return false;
    }
    return this.version === other.toString();
  }

  /**
   * Get a `file:`-type dependency version string
   * from a path. You probably want to use a relative
   * path!
   */
  static fromLocalPath(path: string) {
    return new DependencyVersion(`file:${new Pathy(path).relative}`);
  }

  /**
   * Given a version string from a `package.json` dependency,
   * return the inferred version type.
   */
  static inferType(version: string): DependencyVersionType {
    if (version.match(/^(file|workspace):/)) {
      return 'local';
    } else if (version.match(/^https?:/)) {
      return 'url';
    } else if (version.match(/^git(\+(ssh|http|https|file))?:/)) {
      return 'git';
    } else if (version.match(/^[a-z0-9_-]+\/[a-z0-9_.-]+$/i)) {
      return 'github';
    }
    // An actual version string (e.g. `1.0.0`) is also
    // technically a "range", so we'll check to see if
    // it's a range first in case the precision is needed.
    else if (semver.valid(version)) {
      return 'semver';
    } else if (semver.validRange(version)) {
      return 'range';
    }
    return 'tag';
  }

  /**
   * If the version is a semver string (as opposed to a range or path), return `true`.
   */
  static isSemver(version: string | DependencyVersion) {
    if (DependencyVersion.inferType(version.toString()) === 'semver') {
      return true;
    }
    return false;
  }

  toString() {
    return this.version;
  }

  toJSON() {
    return this.version;
  }
}
