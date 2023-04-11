import {
  PackageNameEqualityCheckOptions,
  PackageNameEqualityOperand,
} from '@bscotch/config';
import { Pathy, PathyOrString } from '@bscotch/pathy';
import { Project } from '@bscotch/project';
import { ok } from 'assert';
import type { Workspace } from './workspace.js';

export async function findPnpmWorkspaceConfig(
  dir: Pathy,
): Promise<Pathy<{ packages: string[] }> | undefined> {
  return (await dir.listChildren()).find((f) =>
    f.basename.match(/^pnpm-workspace\.ya?ml$/),
  ) as Pathy<{ packages: string[] }> | undefined;
}

export async function findWorkspaceProjectFuzzily(
  this: Workspace,
  nameOrPath: PathyOrString | PackageNameEqualityOperand,
): Promise<Project | undefined> {
  if (nameOrPath instanceof Pathy) {
    return await this.findProjectByPath(nameOrPath);
  } else if (typeof nameOrPath === 'string') {
    // Could be a name or a path
    return (
      (await this.findProjectByPath(nameOrPath)) ||
      (await this.findProjectByName(nameOrPath, { allowMissingScope: true }))
    );
  } else {
    // Some form of package name check
    return await this.findProjectByName(nameOrPath, {
      allowMissingScope: true,
    });
  }
}

export async function findWorkspaceProjectByName(
  this: Workspace,
  name: PackageNameEqualityOperand,
  options?: Pick<PackageNameEqualityCheckOptions, 'allowMissingScope'>,
): Promise<Project | undefined> {
  return (await this.listProjects()).find((p) => p.name.equals(name, options));
}

export async function findWorkspaceProjectByPath(
  this: Workspace,
  projectPath: string | Pathy,
): Promise<Project | undefined> {
  projectPath = new Pathy(projectPath, this.dir);
  return (await this.listProjects()).find((p) => p.dir.isParentOf(projectPath));
}

export async function listWorkspaceProjects(
  this: Workspace,
): Promise<Project[]> {
  const projectPatterns = await this.projectGlobs();
  ok(
    projectPatterns.length,
    'No workspace patterns found in root package.json.',
  );
  const projects: Project[] = [];
  const roots = await this.projectsRoots();
  await Promise.all(
    roots.map((r) =>
      r.listChildrenRecursively({
        onInclude(path) {
          projects.push(
            new Project({
              dir: path.up(),
              workspaceProjects: projects,
            }),
          );
        },
        filter: async (child, siblings) => {
          if (await child.isFile()) {
            if (child.basename === 'package.json') {
              return true;
            }
            return false;
          }
          if (siblings.some((s) => s.basename == 'package.json')) {
            // We don't allow nested projects
            return false;
          }
          // Keep exploring folders
          return;
        },
      }),
    ),
  );

  return projects;
}

export async function workspaceIncludesProject(
  this: Workspace,
  project: Project,
  options?: { assert?: boolean },
) {
  const projects = await this.listProjects();
  // Ensure the project belongs to the Workspace
  const hasProject = !!projects.find((p) => p.equals(project));
  if (options?.assert) {
    ok(hasProject, 'Project not found in the Workspace');
  }
  return hasProject;
}
