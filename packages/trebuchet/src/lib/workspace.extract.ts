import { Pathy } from '@bscotch/pathy';
import { Project, ProjectExtractOptions } from '@bscotch/project';
import type { Workspace } from './workspace.js';

export async function extractProject(
  this: Workspace,
  project: Project,
  options: ProjectExtractOptions,
): Promise<void> {
  options = { ...options };
  options.dir = new Pathy(options.dir, this.dir).absolute;
  const { newProjectDir, exportedTokens } = await project.extractProject(
    options,
  );
  if (!options.dryRun) {
    await (
      await this.vscodeWorkspaceConfig()
    )?.addFolder({
      name: options.name,
      path: newProjectDir,
    });
  }

  // Update all other projects -- find their use
  // of any of the exported tokens from the *old*
  // project and start importing them from the *new*
  // project.
  for (const otherProject of await this.listProjects()) {
    if (otherProject.name.equals(project.name)) {
      continue;
    }
    await otherProject.changeImportTokensToDifferentModule(
      project.name.toString(),
      options.name,
      exportedTokens,
      options,
    );
  }
}
