import fs, { Dirent } from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileStatsSync } from './files.stats.js';

export interface ListPathOptions {
  /**
   * By default the .git folder is skipped.
   *
   * Include it by setting this to `true`
   */
  includeDotGit?: boolean;
  /**
   * By default the node_modules folder is skipped
   *
   * Include it by setting this to `true`
   */
  includeNodeModules?: boolean;
  /**
   * Directory basenames that should be excluded
   * when walking the directory tree.
   */
  excludeDirs?: string[];
  /**
   * File basename patterns that should be excluded.
   *
   * (Matched against both files and folders.)
   */
  excludePatterns?: RegExp[];
  /**
   * Filter files based on whatever criteria you please.
   *
   * Paths that return `false` will be excluded.
   */
  filter?: (fileBasename: string, info: Dirent) => boolean;
  recursive?: boolean;
  unsorted?: boolean;
  /**
   * By default all paths will be included. Optionally
   * include only folders.
   */
  onlyFolders?: boolean;
  /**
   * By default all paths will be included. Optionally
   * include only files.
   */
  onlyFiles?: boolean;
}

interface RecursiveReaddirReducerAccumulator {
  paths: string[];
  files: string[];
  dirs: string[];
}

type RecursiveReaddirReducer = (
  acc: RecursiveReaddirReducerAccumulator,
  file: Dirent,
) => RecursiveReaddirReducerAccumulator;

function generateReaddirReducerAccumulator(): RecursiveReaddirReducerAccumulator {
  return {
    paths: [],
    files: [],
    dirs: [],
  };
}

/**
 * The built-in {@link fs.readdir} function is not recursive
 * and only returns the immediate children of the directory
 * as relative paths.
 *
 * Using it recursively results in paths missing their folder
 * structure.
 *
 * This function is intended to be used in a recursive context
 * to filter unwanted files/folders and to return the full paths
 * relative to the starting point.
 *
 * It's a reducer function to allow filtering
 * and mutating in one pass for performance.
 *
 * @internal
 */
function generateDirentReducer(
  currentDirectory: string,
  options: ListPathOptions,
): RecursiveReaddirReducer {
  const excludeDirs = options.excludeDirs || [];
  for (const [folder, include] of [
    ['.git', options.includeDotGit],
    ['node_modules', options.includeNodeModules],
  ] as const) {
    if (!include) {
      excludeDirs.push(folder);
    }
  }
  const excludePatterns = options.excludePatterns?.length
    ? options.excludePatterns
    : null;

  return (reducedPaths, fileInfo) => {
    const fileBasename = path.basename(fileInfo.name);
    // Skip files & folders that match the exclude patterns
    if (excludePatterns?.find((p) => p.test(fileBasename))) {
      return reducedPaths;
    }
    if (options.filter && !options.filter(fileBasename, fileInfo)) {
      return reducedPaths;
    }
    const isDir = fileInfo.isDirectory();
    if (isDir) {
      // Skip folders that match the exclude dirs
      if (excludeDirs.includes(fileBasename)) {
        return reducedPaths;
      }
    }
    const filePath = path.join(currentDirectory, fileInfo.name);
    reducedPaths.paths.push(filePath);
    reducedPaths[isDir ? 'dirs' : 'files'].push(filePath);
    return reducedPaths;
  };
}

/**
 * Extension to the {@link fs.readdir} (promise lib) function that:
 *
 * - Adds filtering
 * - Returns separated lists of files and directories
 * - Returns full paths relative to the starting point
 *
 * See {@link readdirSync} for the synchronous version.
 */
async function readdir(dir: string, options: ListPathOptions) {
  const reducer = generateDirentReducer(dir, options);
  return (await fsp.readdir(dir, { withFileTypes: true })).reduce(
    reducer,
    generateReaddirReducerAccumulator(),
  );
}

/**
 * Extension to the {@link fs.readdirSync} function that:
 *
 * - Adds filtering
 * - Returns separated lists of files and directories
 * - Returns full paths relative to the starting point
 *
 * See {@link readdir} for the asynchronous version.
 */
function readdirSync(dir: string, options: ListPathOptions) {
  const reducer = generateDirentReducer(dir, options);
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .reduce(reducer, generateReaddirReducerAccumulator());
}

function returnValueIfNotDirectory<P extends string>(
  filePath: P,
  stats: fs.Stats | void,
): [] | [P] | void {
  if (!stats) {
    return [];
  } else if (stats.isFile()) {
    return [filePath];
  }
}

/**
 * List all files and folders in a directory. If `dir` is a
 * path, return it in an array.
 */
export function listPathsSync(dir: string, options?: ListPathOptions): string[];
export function listPathsSync(
  dir: string,
  recursive?: boolean,
  options?: ListPathOptions,
): string[];
export function listPathsSync(
  dir: string,
  recursiveOrOptions?: boolean | ListPathOptions,
  options?: ListPathOptions,
): string[] {
  // Clean up the params
  let recursive = false;
  if (typeof options === 'object') {
    // Then definitely using the 3-arg pattern
    recursive = (recursiveOrOptions as boolean) ?? options?.recursive ?? false;
  } else if (typeof recursiveOrOptions === 'boolean') {
    recursive = recursiveOrOptions;
  } else if (typeof recursiveOrOptions === 'object') {
    recursive = recursiveOrOptions?.recursive ?? false;
  }
  options = options || {};
  options.recursive = recursive;

  const collectedPaths: string[] = [];

  function recursivelyListPaths(cumulativeDir: string) {
    const earlyReturn = returnValueIfNotDirectory(
      cumulativeDir,
      fileStatsSync(cumulativeDir),
    );

    if (earlyReturn) {
      return earlyReturn;
    }

    const {
      dirs,
      files,
      paths: allPaths,
    } = readdirSync(cumulativeDir, options || {});

    const listedPaths = options?.onlyFiles
      ? files
      : options?.onlyFolders
      ? dirs
      : allPaths;
    collectedPaths.push(...listedPaths);

    if (recursive && dirs.length) {
      // It's a matter of what gets RETURNED (onlyPaths, onlyDirs, or both)
      const morePaths = dirs
        .map((nextDir) => recursivelyListPaths(nextDir))
        .flat(1);
      listedPaths.push(...morePaths);
    }
    return listedPaths;
  }
  const listedPaths = recursivelyListPaths(dir);
  if (!options.unsorted) {
    listedPaths.sort();
  }
  return listedPaths;
}

/**
 * List all folders in a directory.
 */
export function listFoldersSync(
  dir: string,
  recursive = false,
  options?: ListPathOptions,
) {
  return listPathsSync(dir, recursive, options).filter((pathName) =>
    fs.statSync(pathName).isDirectory(),
  );
}

/**
 * List all files in a directory or, if 'dir' is already a file,
 * just return that filename as an array.
 */
export function listFilesSync(
  dir: string,
  recursive = false,
  options?: ListPathOptions,
) {
  if (fs.statSync(dir).isFile()) {
    return [dir];
  }
  return listPathsSync(dir, recursive, options).filter((filePath) =>
    fs.statSync(filePath).isFile(),
  );
}

/**
 * List all files in a directory or, if 'dir' is already a file,
 * just return that filename as an array.
 */
export function listFilesByExtensionSync(
  dir: string,
  extension: string | string[],
  recursive = false,
  options?: ListPathOptions,
) {
  const extensions = Array.isArray(extension) ? extension : [extension];
  return listFilesSync(dir, recursive, options).filter((fileName) => {
    const ext = path.parse(fileName).ext.slice(1);
    return extensions.includes(ext);
  });
}
