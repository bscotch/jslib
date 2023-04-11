import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AnyFunction } from '../types/utility.js';
import { listFoldersSync } from './files.list.js';

export * from './files.list.js';
export * from './files.stats.js';

/**
 * Find and delete all empty directories.
 */
export function removeEmptyDirsSync(
  startDir: string,
  options?: { excludeRoot?: boolean },
) {
  const folders = listFoldersSync(startDir, true);
  if (!options?.excludeRoot) {
    folders.unshift(startDir);
  }
  folders.reverse();
  for (const folder of folders) {
    try {
      fs.rmdirSync(folder);
    } catch {}
  }
}

/**
 * Convert JSON-stringifiable data into a JavaScript module in ESM format,
 * as a string. (Use {@link asModuleString} instead to write
 * directly to file.)
 *
 * @param type - The type, as a string that can be inserted.
 * (Appended to the export, e.g. `export default {your:'stuff'} as type;`)
 * @param preamble - Any content that should appear above the export
 * (e.g. imports)
 */
export function asModuleString(data: any, type?: string, preamble?: string) {
  return `${preamble ? `${preamble}\n\n` : ''}export default ${JSON.stringify(
    data,
  )}${type ? ` as ${type}` : ''};\n`;
}

/**
 * Convert JSON-stringifiable data into an exported JavaScript type,
 * exported as an EMS module, saved to file.
 *
 * @param type - The type, as a string that can be inserted.
 * (Appended to the export, e.g. `export default {your:'stuff'} as type;`)
 * @param preamble - Any content that should appear above the export
 * (e.g. imports)
 */
export function writeAsModule(
  data: any,
  filePath: string,
  type?: string,
  preamble?: string,
) {
  const ext = path.extname(filePath);
  if (!['.js', '.ts'].includes(ext)) {
    throw new Error(`${filePath} must have a ts or js extension`);
  }
  const asString = asModuleString(
    data,
    ext == '.ts' ? type : undefined,
    preamble,
  );
  fs.writeFileSync(filePath, asString);
  return asString;
}

export function readJsonFileSync<Contents = unknown>(
  filePath: string,
): Contents {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

export function writeJsonFileSync(
  filePath: string,
  data: any,
  spaces = 2,
  replacer?: AnyFunction,
) {
  fs.writeFileSync(filePath, JSON.stringify(data, replacer, spaces));
}

/**
 * From within an ESM module, call with `import.meta` as the
 * argument to obtain a clean filepath to the module.
 */
export function getModuleFilepath(meta: { url: string }) {
  if (!meta?.url) {
    throw new Error(`Provided object does not have a url property`);
  }
  return fileURLToPath(new URL(meta.url));
}

/**
 * From within an ESM module, call with `import.meta` as the
 * argument to obtain a clean filepath to the module.
 *
 * For the full filepath, use {@link getModuleFilepath}
 */
export function getModuleDir(meta: { url: string }) {
  return path.dirname(getModuleFilepath(meta));
}

/**
 * Work backwards, starting from `startDir` (inclusive),
 * to find the first parent directory containing a given
 * file (or directory) `findFile`.
 *
 * @example
 * ```ts
 * // Find the `package.json` file corresponding to the
 * // package that contains the current commonjs module.
 * findParentWithFile('package.json',__dirname);
 * ```
 */
export function findParentByFileSync(
  findFile: string,
  startDir = process.cwd(),
) {
  let currentDir = startDir;
  while (currentDir) {
    const filePath = path.join(currentDir, findFile);
    if (fs.existsSync(filePath)) {
      return currentDir;
    }
    if (path.dirname(currentDir) === currentDir) {
      break;
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error(`File ${findFile} not found in any parent of ${startDir}`);
}
