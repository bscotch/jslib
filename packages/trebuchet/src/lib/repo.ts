import { DependencyVersion, PackageName } from '@bscotch/config';
import { Pathy, PathyOrString } from '@bscotch/pathy';
import { ArrayOrSingleton, arrayWrapped, memoize } from '@bscotch/utility';
import { assertUserClaim } from '@bscotch/validation';
import { ok } from 'assert';
import semver from 'semver';
import { default as simpleGit, SimpleGit } from 'simple-git';
import { GitLog, GitVersionTagParsed } from './gitLog.js';
import { GitLogChangeDescription } from './gitLog.types.js';

export interface RepoLogOptions {
  /**
   * Provide an array of folders (relative to the
   * git root, or absolute) to only include commits
   * that affect files within those folders.
   *
   * @example
   * ['packages/foo']
   */
  onlyIfFoldersImpacted?: PathyOrString[];
  /**
   * To stop the list at the last published version
   * of a given package, provide the package name.
   * Assumes that versions are marked with a tag
   * in format `project-name@version`.
   *
   * @example
   * '@bscotch/utility' // List all commits since the last published version of @bscotch/utility
   * '@bscotch/utility@1.0.0' // List all commits since version 1.0.0 of @bscotch/utility
   */
  sinceProjectVersionTag?: string;
}

/**
 * Parsed version tags organized by project name.
 */
export type RepoVersionTags = { [projectName: string]: GitVersionTagParsed[] };

interface ProjectInfo {
  name?: string | PackageName;
  version?: string | DependencyVersion;
}

/**
 * A helper class for managing a git repository,
 * with special focus on monorepo management. Uses
 * [simple-git](https://github.com/steveukx/git-js)
 * with helper methods.
 */
export class Repo {
  readonly git: SimpleGit;

  constructor(readonly dir: Pathy) {
    this.git = simpleGit(dir.absolute);
  }

  computeProjectVersionTag(project: ProjectInfo) {
    ok(project.name, 'Project name is required');
    ok(project.version, 'Project version is required');
    // Clean up the info to create the tag name
    const projectVersion = project.version.toString();
    const projectName = project.name.toString();
    ok(
      DependencyVersion.isSemver(projectVersion),
      `Version ${projectVersion} is not a valid semver`,
    );
    return new PackageName({
      name: projectName,
      version: projectVersion,
    }).toString({ includeVersion: true });
  }

  async addProjectVersionTag(project: ProjectInfo) {
    const tag = this.computeProjectVersionTag(project);

    // Add the tag
    await this.git.addAnnotatedTag(tag, `Bumped the version`);
  }

  async latestProjectVersion(
    projectName: string | PackageName,
  ): Promise<string | undefined> {
    const tags = await this.listProjectVersionTags(projectName);
    return tags.at(-1);
  }

  async listProjectVersionTags(projectName: string | PackageName) {
    const pattern = `${projectName}@*`;
    const tags = (await this.git.tags(['--list', pattern])).all.map((t) =>
      t.replace(/^.*@([^@]+)$/, '$1'),
    );
    tags.sort(semver.compare);
    return tags;
  }

  async fetch(): Promise<void> {
    await this.git.fetch(['--all', '--tags', '--prune']);
  }

  async pull(): Promise<void> {
    await this.git.pull(['--rebase', '--all', '--tags']);
  }

  async push(): Promise<void> {
    await this.git.push(['--follow-tags']);
  }

  async add(path: ArrayOrSingleton<PathyOrString>) {
    const paths = arrayWrapped(path).map(
      (p) => new Pathy(p, this.dir).absolute,
    );
    return await this.git.add(paths);
  }

  async commit(message: string | GitLogChangeDescription) {
    return await this.git.commit(
      typeof message === 'string'
        ? message
        : GitLog.serializeParsedMessage(message),
    );
  }

  /**
   * Since all projects share the same git log, being
   * able to re-use the same retrieved list of parsed
   * logs is useful for performance.
   */
  @memoize
  protected async allLogs() {
    const logOptions = {
      // Topo-order better reflects how changes
      // make it out into production, so it is
      // better for creating meaningful changelogs.
      '--topo-order': null,
      // Causes the `diff` field to be populated
      // with impacted file paths.
      '--stat': 4096,
    };
    const logs = (await this.git.log(logOptions)).all.map(
      (raw) => new GitLog(raw, this.dir),
    );
    return logs;
  }

  async logs(options?: {
    onlyIfFoldersImpacted?: PathyOrString[];
    stopAtLastProjectVersionTag?: string;
  }): Promise<GitLog[]> {
    const onlyIfFoldersImpacted = options?.onlyIfFoldersImpacted?.map(
      (f) => new Pathy(f, this.dir),
    );
    const logs = await this.allLogs();
    // Track file renames so that we can map old
    // names onto the *current* folders.
    const renamedFileMap: { [oldName: string]: Pathy } = {};

    const keepLogs: GitLog[] = [];
    for (const log of logs) {
      let foldersAreImpacted = false;
      if (onlyIfFoldersImpacted) {
        for (const affectedFile of log.files) {
          // Map the old name to the current name, if needed
          const filePath =
            renamedFileMap[affectedFile.relative] || affectedFile;
          // If this was a rename operation, store the rename
          if (affectedFile.renamedFrom) {
            renamedFileMap[affectedFile.renamedFrom.relative] = filePath;
          }

          // If the file is in one of the folders we care about, keep it. Only one match is required, since
          // we are operating at the entire-commit level
          if (
            onlyIfFoldersImpacted.some((folder) => folder.isParentOf(filePath))
          ) {
            foldersAreImpacted = true;
            break;
          }
        }
      }
      if (!onlyIfFoldersImpacted || foldersAreImpacted) {
        keepLogs.push(log);
      }
      const isLastPublishedVersion =
        options?.stopAtLastProjectVersionTag &&
        log.hasProjectVersionTag(options.stopAtLastProjectVersionTag);
      if (isLastPublishedVersion) {
        break;
      }
    }
    return keepLogs;
  }

  async findRepoRoot(fromPath: PathyOrString): Promise<Repo> {
    const dir = await new Pathy(fromPath).findInParents('.git');
    assertUserClaim(
      dir,
      `Could not find a .git directory in ${fromPath} or its parents`,
    );
    return new Repo(dir);
  }
}
