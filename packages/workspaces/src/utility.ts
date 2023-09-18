export function normalizePath(path: string) {
  return path.replace(/\\+/g, '/').replace(/\/$/, '');
}

export function getDirectory(path: string) {
  const pathParts = normalizePath(path).split('/');
  if (pathParts.length === 1) {
    // e.g. "package.json"
    return '';
  }
  return normalizePath(path).split('/').slice(0, -1).join('/');
}

/** A conventional-commits-compatible header pattern, with no assumptions about what type names are allowed. */
export const conventionalCommitsHeaderPattern =
  /^(?<type>[a-z]+?)(\((?<scope>[^)]*)\))?(?<isBreaking>!)?: (?<description>.*)/;

export const conventionalCommitsBodyPattern =
  /\b(?<isBreaking>BREAKING( CHANGE)?): (?<description>.*)/;

// Regex for semver strings
export const semverPatternString =
  '(?<version>(?<major>0|[1-9]\\d*)\\.(?<minor>0|[1-9]\\d*)\\.(?<patch>0|[1-9]\\d*)(?:-(?<prerelease>(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\\.(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\\.[0-9a-zA-Z-]+)*))?)';

export function monorepoVersionPattern(packageName: string) {
  return new RegExp(`^${packageName}@${semverPatternString}$`);
}

/**
 * Returns `true` if `str` is an exact match to `pattern` (when
 * it's a string) or if `str` matches `pattern` (when it's a RegExp).
 */
export function isMatch(str: string, pattern: string | RegExp) {
  return typeof pattern === 'string' ? str === pattern : pattern.test(str);
}
