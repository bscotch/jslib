import { Project } from '@bscotch/project';
import { deepEquals } from '@bscotch/utility';
import { ok } from 'assert';
import semver from 'semver';
import { GitLog } from './gitLog.js';
import type { Workspace } from './workspace.js';
import {
  WorkspacePublishOptions,
  WorkspaceVersionOptions,
} from './workspace.types.js';
// import {default as latest} from 'latest-version';
// import semver from 'semver';

function anyAreTruthy(args: any[]) {
  const someAreTruthy = args.some((x) => !!x);
  return someAreTruthy;
}

function normalizePublishOptions(
  options?: WorkspacePublishOptions,
): WorkspacePublishOptions {
  return {
    ...options,
    noPush: anyAreTruthy([(options?.noCommit, options?.noPush)]),
    noTag: anyAreTruthy([(options?.noCommit, options?.noPush, options?.noTag)]),
  };
}

/**
 * Determine bump level for all changed
 * packages, bump them, and commit
 *
 * Assumes that:
 * - Version tags are the "truth" for which commits correspond to versioning+publishing events.
 * - Tags are in format `@bscotch/utility@4.0.0`
 * - Current `package.json` `version` field is the latest version.
 * - The changed-files of a commit can be used to infer whether the commit applied to a given project
 * - The bump level can be inferred using the conventional-commit strategy.
 * - The changelog should be *added to* instead of *replaced*, assuming that the changelog has already been written up to the last published version.
 */
export async function publishProjects(
  this: Workspace,
  options: WorkspacePublishOptions,
) {
  options = normalizePublishOptions(options);

  // Make sure we're up to date!
  if (!options?.noPull) {
    await this.repo.pull();
  }

  const bumpedProjects = await listBumpedProjects(this);

  if (!bumpedProjects.length) {
    console.warn('No bumped projects found.');
    return;
  }

  // const filterMap =
  //   ({
  //     dependents,
  //     dependencies,
  //   }: { dependents?: boolean; dependencies?: boolean } = {}) =>
  //   (project: Project) =>
  //     `--filter=${dependencies ? '...' : ''}${project.name}${
  //       dependents ? '...' : ''
  //     }`;

  // // Make sure all deps are installed etc!
  // await this.packageJson.execute([
  //   'install',
  //   ...bumpedProjects.map(filterMap({ dependencies: true, dependents: true })),
  // ]);

  // // Make sure we're freshly built to ensure that built files
  // // match the source (and thus that passing tests are accurate).
  // const canRunTasks =
  //   (await this.hasTurbo()) && this.packageJson.packageManager === 'pnpm';
  // ok(
  //   canRunTasks || (options?.noRebuild && options?.noTest),
  //   'Currently only pnpm + turborepo are supported for cleaning and testing prior to publishing. Re-run with --noClean and --noTest to skip those steps.',
  // );
  // if (canRunTasks) {
  //   const tasks: string[] = [];
  //   if (!options?.noRebuild) {
  //     tasks.push('build');
  //   }
  //   if (!options?.noTest) {
  //     tasks.push('test');
  //   }
  //   if (tasks.length) {
  //     await this.packageJson.execute([
  //       'turbo',
  //       'run',
  //       '--force',
  //       ...tasks,
  //       ...bumpedProjects.map(
  //         filterMap({ dependencies: true, dependents: true }),
  //       ),
  //     ]);
  //   }
  // }

  // For each project, in turn, + tag + publish (abort if any fail, which will prevent publishing of dependents and also prevent wonky tag situations).
  for (const project of bumpedProjects) {
    if (!options.noTag) {
      await this.repo.addProjectVersionTag(project);
    } else {
      console.warn(
        `noTag is true -- would have tagged ${
          project.name
        } with ${this.repo.computeProjectVersionTag(project)}`,
      );
    }
    if (project.packageJson.isPublishable) {
      await project.packageJson.publish({ dryRun: options.noPush });
    }
    if (!options.noPush) {
      await this.repo.push();
    }
  }
}

/**
 * List the projects in the workspace that have had a version
 * bump (compared to the latest git tags).
 *
 * Throws if any bumped project's dependents are not also bumped.
 */
async function listBumpedProjects(workspace: Workspace): Promise<Project[]> {
  const graph = await workspace.dependencyGraph({
    excludeDevDependencies: true,
  });
  const bumped: Project[] = [];
  for (const project of graph) {
    // If we've already added it, move along!
    if (bumped.find((p) => p.equals(project))) {
      continue;
    }
    if (!(await projectIsBumped(workspace, project))) {
      continue;
    }
    bumped.push(project);
    // Make sure that dependents have also been versioned.
    for (const dep of graph.dependentsOf(project)) {
      ok(
        await projectIsBumped(workspace, dep),
        `Dependent ${dep.name} of bumped project ${project.name} must also be bumped!`,
      );
    }
  }
  return bumped;
}

async function projectIsBumped(
  workspace: Workspace,
  project: Project,
): Promise<boolean> {
  const publishedVersion = await workspace.repo.latestProjectVersion(
    project.name,
  );
  const currentVersion = project.packageJson.version!;
  ok(
    !publishedVersion ||
      semver.gte(currentVersion.toString(), publishedVersion),
    `Project ${project.name} has version ${currentVersion} in its package.json, which is less than the latest published ${publishedVersion}`,
  );
  if (
    publishedVersion &&
    semver.eq(currentVersion.toString(), publishedVersion)
  ) {
    return false;
  }
  return true;
}

/**
 * Determine bump level for all changed
 * packages, bump them, update changelogs, and commit.
 *
 * @remarks
 * Version tags are not added here. They are added during the
 * publishing step.
 *
 * Assumes that:
 * - Version tags are the "truth" for which commits correspond to versioning+publishing events.
 * - Tags are in format `@bscotch/utility@4.0.0`
 * - Current `package.json` `version` field is the latest version.
 * - The changed-files of a commit can be used to infer whether the commit applied to a given project
 * - The bump level can be inferred using the conventional-commit strategy.
 * - The changelog should be *added to* instead of *replaced*, assuming that the changelog has already been written up to the last published version.
 */
export async function versionProjects(
  workspace: Workspace,
  options: WorkspaceVersionOptions,
): Promise<Project[]> {
  options = normalizePublishOptions(options);

  // Make sure we're up to date (especially for tags)
  if (!options?.noPull) {
    await workspace.repo.pull();
  }

  const bumpedProjects: Project[] = [];
  const projectDepGraph = await workspace.dependencyGraph({
    excludeDevDependencies: true,
  });

  // Work through the dependency graph:
  // 1. bump versions if the changelog warrants it
  // 2. bump dependents of bumped projects
  // 3. TODO: Add dependency-bump to changelog of dependents
  // 4. TODO: Update the changelog of the bumped project
  for (const project of projectDepGraph) {
    let bump =
      options?.bump || (await inferProjectBumpFromGitLogs(workspace, project));

    workspace.trace(`Inferred bump ${project.name}`, bump);

    const pkgInitial = project.packageJson.toJSON();
    // await project.updateDependencyListings({
    //   localPackages: projectDepGraph.list(),
    // });

    // Detect any changes that would require a bump, if we aren't already bumping
    if (!bump) {
      const pkgUpdated = project.packageJson.toJSON();
      const isChanged = !deepEquals(pkgInitial, pkgUpdated);
      const localDepHasChanged = bumpedProjects
        .map((b) => b.name.toString())
        .find((name) => project.packageJson.flattenedDependencies()[name]);
      bump = isChanged || localDepHasChanged ? 'patch' : undefined;
      workspace.trace(`Checked deps changes for bump ${project.name}`, bump);
    }

    // Update the version
    if (bump) {
      await project.packageJson.bumpVersion(bump);
      bumpedProjects.push(project);
    }
  }

  if (!options.noCommit) {
    await workspace.repo.add(bumpedProjects.map((p) => p.packageJson.path));

    await workspace.repo.commit(
      `bumped: ${bumpedProjects
        .map((p) => `${p.name}@${p.version}`)
        .join(', ')}`,
    );

    if (!options.noPush) {
      await workspace.repo.push();
    }
  }

  return bumpedProjects;
}

export async function inferProjectBumpFromGitLogs(
  workspace: Workspace,
  project: Project,
) {
  const logs = await workspace.repo.logs({
    onlyIfFoldersImpacted: [project.dir],
    stopAtLastProjectVersionTag: project.name.toString(),
  });

  // Determine the bump level from the git history
  return GitLog.maxBump(logs);
}
