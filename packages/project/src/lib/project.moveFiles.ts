import { ok } from 'assert';
import { Pathy } from '@bscotch/pathy';
import type { Project } from './project.js';

/**
 * Move (rename) source files, with automatic
 * updates to import statements across the project.
 *
 * Matches against the project-root-relative filepath
 * (POSIX-style path), renaming with `String.prototype.replace(match, rename)`.
 *
 * Use with care: *any* file matching the input pattern
 * will be renamed! An error will be thrown if any new
 * path falls outside the Project directory.
 *
 * @example
 *
 */
export async function moveProjectFiles(
  project: Project,
  options: {
    match: RegExp;
    rename: string;
    dryRun?: boolean;
  },
) {
  const morpher = await project.codeMorpher();
  const renames: [from: string, to: string][] = [];
  for (const sourceFile of morpher.getSourceFiles()) {
    const filepath = new Pathy(sourceFile.getFilePath(), project.dir);
    const match = filepath.relative.match(options.match);
    if (!match) {
      project.trace(
        `moveFiles: "${filepath.relative}" does not match ${options.match}`,
      );
      continue;
    }
    const newPath = new Pathy(
      filepath.relative.replace(options.match, options.rename),
      project.dir,
    );
    ok(
      Pathy.isParentOf(project.dir, newPath.absolute),
      `New path "${newPath}" is outside project root "${project.dir}"`,
    );
    if (newPath.equals(filepath)) {
      project.trace(
        `moveFiles: matching file "${filepath.relative}" ended up with the same name`,
      );
      continue;
    }
    renames.push([filepath.relative, newPath.relative]);
    console.log('Moving', filepath.relative, '▶', newPath.relative);
    if (!options.dryRun) {
      sourceFile.move(newPath.absolute);
    }
  }
  // Move all of the files around
  if (!options.dryRun) {
    await morpher.save();
  }
  return renames;
}
