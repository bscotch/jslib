import { PackageJson } from '@bscotch/config';
import { Project } from '@bscotch/project';
import { ok } from 'assert';
import { copy } from 'fs-extra';
import type { Workspace } from './workspace.js';
import type { WorkspaceImportProject } from './workspace.types.js';

export async function importProjectIntoWorkspace(
  this: Workspace,
  options: WorkspaceImportProject,
) {
  const importingProject = await PackageJson.findPackageJson({
    fromPath: options.from,
  });

  if (options.dryRun) {
    console.log('Importing project: ', importingProject.name);
  }

  // Copy each separately instead of in batch to prevent
  // accidental inclusion of node_modules etc
  const srcFiles = await importingProject.dir.listChildrenRecursively();
  for (const file of srcFiles) {
    const target = this.dir.join(options.to, file.relative);
    if (options.dryRun) {
      console.log(`Copy ${file.absolute} to ${target.absolute}`);
    } else {
      await copy(file.absolute, target.absolute);
    }
  }

  // Load as new project
  const importedProject = await Project.findProject({ fromPath: options.to });
  ok(
    importedProject.name.equals(importingProject.name),
    `Found project ${importedProject.name} does not match source project ${importingProject.name}`,
  );

  await this.addFolderToVscodeConfig({
    name: importingProject.name.toString(),
    path: options.to,
    dryRun: options.dryRun,
  });

  // Add it as a dependency to the workspace package.json
  if (!options.dryRun) {
    await this.packageJson.install(importedProject.packageJson);
  }
}
