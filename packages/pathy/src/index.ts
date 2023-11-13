export { existsSafe, readSafe, rmSafe, statSafe, writeSafe } from './fsSafe.js';
export * from './pathy.js';
export type * from './pathy.types.js';
import { Pathy, type PathyOptions } from './pathy.js';

/**
 * Shorthand for `new Pathy(...)`.
 */
export function pathy<FileContent = unknown>(
  path?: string | Pathy,
  cwd?: string | Pathy,
): Pathy<FileContent>;
export function pathy<FileContent = unknown>(
  path?: string | Pathy,
  options?: PathyOptions<FileContent>,
): Pathy<FileContent>;
export function pathy<FileContent = unknown>(
  path?: string | Pathy,
  cwdOrOptions?: any,
): Pathy<FileContent> {
  return new Pathy(path, cwdOrOptions);
}
