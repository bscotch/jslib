import { Pathy, PathyOrString } from '@bscotch/pathy';
import { Project } from '@bscotch/project';
import { ok } from 'assert';
import type { Workspace } from './workspace.js';

export async function moveWorkspaceProject(
  this: Workspace,
  project: Project,
  where: PathyOrString,
) {
  await this.hasProject(project, { assert: true });
  const newLocation = new Pathy(where, this.dir);
  ok(
    (await this.projectsRoots()).find((r) => r.isParentOf(newLocation)),
    `New project location (${newLocation.relative}) does not match workspaces globs in root package.json: ${this.projectGlobs}`,
  );
  await project.move(newLocation);
  this.clearMemoized();
}
