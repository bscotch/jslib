import nodePath from 'path';

/**
 * Pass to `.sort()` got an array of paths to get
 * them sorted by *least* to *most* specific (i.e.
 * fewest to most subdirs) and alphabetically by
 * directory within a specificity tier.
 *
 * @param separator - Optionally specify a different
 * path separator (defaults to regex `/[\\/]+/`).
 */
export function sortPathsByFolder(
  path1: string,
  path2: string,
  separator: string | RegExp = /[\\/]+/,
) {
  const path1Parts = path1.split(separator);
  const path2Parts = path2.split(separator);
  if (path1Parts.length != path2Parts.length) {
    return path1Parts.length - path2Parts.length;
  }
  // Sort alphabetically but by folder
  for (let i = 0; i < path1Parts.length; i++) {
    const part1 = path1Parts[i].toLowerCase();
    const part2 = path2Parts[i].toLowerCase();
    if (part1 == part2) {
      continue;
    }
    return part1 < part2 ? -1 : 1;
  }
  return 0;
}

/**
 * Sort paths alphabetically, *by directory*.
 * Returns a sorted copy of the paths array.
 *
 * @example
 * const pathList = [
 *  'hello/world',
 *  'hello',
 *  'h/another',
 *  'hello/world/goodbye'
 * ];
 *
 * // Sort paths alphabetically *by directory* which causes
 * // paths sharing a common parent directory to appear consecutively.
 * sortedPaths(pathList); // =>
 */
export function sortedPaths(paths: string[]) {
  const pathsClone = [...paths];
  pathsClone.sort(sortPathsByFolder);
  return pathsClone;
}

/**
 * Given a path, return all of the parent paths
 * leading up to it.
 *
 * @example
 * `parentPaths('/hello/world/')->['/','/hello','hello/world','hello/world/']`
 */
export function parentPaths(path: string) {
  const paths: string[] = [path];
  while (nodePath.dirname(path) != path) {
    path = nodePath.dirname(path);
    paths.push(path);
  }
  paths.reverse();
  return paths.filter((p) => p != '.');
}

/**
 * Given a path with any style of separators,
 * return the same path with POSIX-style separators.
 *
 * @example
 * toPosixPath("C:\\hello\\world"); // => "/c/hello/world"
 */
export function toPosixPath(pathString: string) {
  const parts = pathString
    .replace(/^([a-z]):\\/i, (_match, drive) => `/${drive.toLowerCase()}/`)
    .split(/[/\\]+/g);
  const withPosixSeps = parts.join('/');
  // When converting a Windows absolute path, e.g. C:// must become /c/
  return withPosixSeps.replace(/^([a-z]):\/\//i, '/$1/');
}
