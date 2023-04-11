import fs, { Stats } from 'fs';
import fsp from 'fs/promises';
import { assert } from './types.js';

export interface FileDoesNotExistException extends NodeJS.ErrnoException {
  code: 'ENOENT';
}

export function isFileSystemError(err: any): err is NodeJS.ErrnoException {
  return ['errno', 'code', 'path', 'syscall'].every((field) => field in err);
}

export function isFileDoesNotExistError(
  err: any,
): err is FileDoesNotExistException {
  return isFileSystemError(err) && err.code === 'ENOENT';
}

export function assertIsFileDoesNotExistError(
  err: any,
): asserts err is FileDoesNotExistException {
  if (!isFileDoesNotExistError(err)) {
    throw err;
  }
}

function handleFileStatsError(
  err: any,
  assertFileExists = false,
): asserts err is FileDoesNotExistException {
  assertIsFileDoesNotExistError(err);
  assert(!assertFileExists, `File does not exist: ${err.path}`);
}

/**
 * Get the stats of a file or directory at a given path.
 *
 * By default returns `undefined` if the path does not exist,
 * but can optionally assert that the path exists.
 */
export async function fileStats(
  filePath: string,
  assertExists = false,
): Promise<Stats | void> {
  try {
    return await fsp.stat(filePath);
  } catch (err) {
    handleFileStatsError(err);
  }
}

export function fileStatsSync(
  filePath: string,
  assertExists = false,
): Stats | void {
  try {
    return fs.statSync(filePath);
  } catch (err) {
    handleFileStatsError(err);
  }
}
