import type { Stats } from 'node:fs';
import fsp from 'node:fs/promises';
import type {
  FileRetryOptions,
  PathyOrString,
  PathyRemoveOptions,
} from './pathy.types.js';
import { PathyError, assert } from './util.js';

/**
 * Read a file, returning the raw binary content. Optionally retry
 * if the file is locked.
 */
export async function readSafe(
  path: PathyOrString,
  options?: FileRetryOptions,
): Promise<Buffer> {
  const { maxRetries, retryDelayMillis } = cleanRetryOptions(options);

  let tries = 0;
  let error: PathyError | null = null;

  while (tries <= maxRetries) {
    error = null;
    try {
      const content = await fsp.readFile(path.toString());
      return content;
    } catch (err) {
      _throwIfMissing(err);
      error = new PathyError(`Failed to read file "${path.toString()}"`, err);
      tries++;
      error.tries = tries;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMillis));
      continue;
    }
  }
  throw error;
}

export async function writeSafe(
  path: PathyOrString,
  content: Buffer | string,
  options?: FileRetryOptions,
) {
  const { maxRetries, retryDelayMillis } = cleanRetryOptions(options);

  let tries = 0;
  let error: PathyError | null = null;

  while (tries <= maxRetries) {
    error = null;
    try {
      await fsp.writeFile(path.toString(), content);
      return;
    } catch (err) {
      error = new PathyError(`Failed to write file "${path.toString()}"`, err);
      tries++;
      error.tries = tries;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMillis));
      continue;
    }
  }
  throw error;
}

export async function existsSafe(
  path: PathyOrString,
  options?: FileRetryOptions,
) {
  try {
    await statSafe(path, options);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try to get stats for a file. If there is an error due to that file
 * not existing, throw. Otherwise retry if requested.
 */
export async function statSafe(
  path: PathyOrString,
  options?: FileRetryOptions,
): Promise<Stats> {
  const { maxRetries, retryDelayMillis } = cleanRetryOptions(options);
  let tries = 0;
  let error: PathyError | null = null;

  while (tries <= maxRetries) {
    error = null;
    try {
      const stats = await fsp.stat(path.toString());
      return stats;
    } catch (err) {
      _throwIfMissing(err);
      error = new PathyError(`Failed to stat file "${path.toString()}"`, err);
      tries++;
      error.tries = tries;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMillis));
      continue;
    }
  }
  throw error;
}

export async function rmSafe(
  path: PathyOrString,
  options?: PathyRemoveOptions,
) {
  const { maxRetries, retryDelayMillis } = cleanRetryOptions(options);
  let tries = 0;
  let error: PathyError | null = null;

  while (tries <= maxRetries) {
    error = null;
    try {
      const stats = await fsp.rm(path.toString(), options);
      return stats;
    } catch (err) {
      if (_isMissingError(err)) {
        if (options?.throwIfMissing) {
          throw err;
        }
        return;
      }
      error = new PathyError(`Failed to remove "${path.toString()}"`, err);
      tries++;
      error.tries = tries;
      await new Promise((resolve) => setTimeout(resolve, retryDelayMillis));
      continue;
    }
  }
  throw error;
}

function cleanRetryOptions(
  options?: FileRetryOptions,
): Required<FileRetryOptions> {
  let maxRetries = options?.maxRetries || 0;
  assert(
    typeof maxRetries === 'number' && maxRetries >= 0,
    'maxRetries must be a non-negative number',
  );
  let retryDelayMillis = options?.retryDelayMillis || 20;
  assert(
    typeof retryDelayMillis === 'number' && retryDelayMillis >= 0,
    'retryDelayMillis must be a non-negative number',
  );
  return { maxRetries, retryDelayMillis };
}

function _isMissingError(err: any) {
  return err instanceof Error && 'code' in err && err.code === 'ENOENT';
}

function _throwIfMissing(err: any) {
  if (_isMissingError(err)) {
    throw err;
  }
}
