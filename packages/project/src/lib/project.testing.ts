import { Pathy } from '@bscotch/pathy';
import { validate } from '@bscotch/validation';
import { default as Mocha, MochaOptions } from 'mocha';
import type { Project } from './project.js';
import { projectTestingSchema } from './project.schemas.js';
import BscotchReporter from './reporter.js';

/**
 * Run any tests found in the project using Mocha.
 */
export async function runProjectTestsWithMocha(
  project: Project,
  options?: MochaOptions,
) {
  options = validate(projectTestingSchema, options || {});
  const mocha = new Mocha({
    reporter: BscotchReporter,
    require: ['@bscotch/validation/install'],
    ...options,
  });
  const files = await project.dir.listChildrenRecursively({
    filter: async (child) => {
      const pathParts = Pathy.explode(child.relative);
      const hasTestPart = pathParts.some((part) =>
        part.match(/\b(test|spec)\b/),
      );
      if (!hasTestPart) {
        return;
      }
      if (await child.isFile()) {
        return !!child.basename.match(/\.[mc]?js$/);
      }
      return;
    },
  });
  files.forEach((f) => mocha.addFile(f.toString()));
  await mocha.loadFilesAsync();
  return new Promise((resolve) => {
    mocha.run((failures) => {
      if (failures > 0) {
        process.exit(1);
      }
      resolve(undefined);
    });
  });
}
