export * from './lib/pathy.js';
import { Pathy, type PathyOptions } from './lib/pathy.js';

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
