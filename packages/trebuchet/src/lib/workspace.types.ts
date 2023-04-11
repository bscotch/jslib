import type { PackageJsonData, PackageJsonFindOptions } from '@bscotch/config';
import { PathyOrString } from '@bscotch/pathy';
import type { ProjectOptions } from '@bscotch/project';
import { ProjectCreateOptions } from '@bscotch/project';
import type { Promisable } from 'type-fest';

export interface WorkspaceMoveProjectOptions {
  /**
   * Where in the workspace to move the project
   * (the path to the new project root, either
   * absolute or relative to the workspace root.)
   *
   * Must be a path that is matched by the
   * `"workspaces"` property of the workspace
   * root `package.json` file.
   *
   * Optional if you are only changing the package name.
   */
  where?: string;
  /**
   * New name for the package. If set, the
   * Workspace root `package.json` and all
   * projects that depend on this one will
   * be updated to reflect the name change,
   * if possible.
   */
  packageName?: string;
}

export interface WorkspaceFindOptions extends PackageJsonFindOptions {
  /**
   * Depending on how deep within a workspace we
   * start searching backwards for the root, we may
   * encounter `package.json` files for *projects*
   * along the way. A test function is required to
   * ensure that we only return the *workspace*
   * package.json file.
   *
   * @default (pkg)=>!!pkg.workspaces
   */
  test?: (pkg: PackageJsonData) => Promisable<any>;
}

/**
 * Cached information about a workspace, computed
 * by the Workspace class, to speed up repeated
 * searches and other operations.
 *
 * Saved in `.trebuchet.json`
 */
export interface WorkspaceConfig {
  /**
   * If provided, new/extracted projects will
   * be added as new folders to the `.code-workspace`
   * file found at this path.
   *
   * This is useful for "multi-workspace"
   * Visual Studio Code setups.
   *
   * If `false`, then we've cached the absence of
   * the `.code-workspace` file.
   */
  vscodeWorkspaceConfigPath?: PathyOrString | false;
  /**
   * NPM package scope to use for new projects.
   */
  npmScope?: string;
}

export interface WorkspaceOptions
  extends Pick<ProjectOptions, 'dir' | 'packageJson'> {}

export interface WorkspaceCreateProjectOptions extends ProjectCreateOptions {}

export interface WorkspaceImportProject {
  /**
   * The path to the project to import.
   */
  from: string;
  /**
   * The path within the workspace to import the project to.
   */
  to: string;
  /**
   * If true, then the actions that *would* be taken
   * will be reported, but not changes will be made to disk.
   */
  dryRun?: boolean;
}

export interface WorkspaceExternalDepsOptions {}

export interface WorkspaceListOptions {
  publishable?: boolean;
  /**
   * How the output should be formatted.
   */
  format?: 'json' | 'table' | 'plain';
  /**
   * List of properties to include in the output.
   */
  includeProperties?: ('dir' | 'name')[];
  /**
   * Whether to print absolute paths. Otherwise paths are relative to cwd.
   */
  absolutePaths?: boolean;
  /**
   * When listing names, scopes are included
   * by default. This can create noise in some
   * contexts, so scopes can be excluded.
   */
  excludeScopes?: boolean;
}

export interface WorkspaceVersionOptions {
  noPull?: boolean;
  /**
   * The bump type is inferred from the git logs, but
   * can be forced by setting this value.
   */
  bump?: 'major' | 'minor' | 'patch';

  /**
   * If true, then no commit will be made after updating
   * the `package.json` files. This is useful for testing
   * or adding a manual review step.
   */
  noCommit?: boolean;

  /**
   * If true, then no push will be made to the remote.
   * This is forced to be `true` if `noCommit` is true,
   * since in that case there's nothing to push!
   */
  noPush?: boolean;
}

export interface WorkspacePublishOptions extends WorkspaceVersionOptions {
  /**
   * If true, then no tag will be added to the resulting
   * commit. This is forced to be `true` if `noCommit` is
   * true.
   */
  noTag?: boolean;
  /**
   * If true, then bumped projects will not be cleaned and
   * rebuilt prior to testing and publishing.
   */
  noRebuild?: boolean;
  /**
   * If true, then bumped projects will not be tested prior
   * to publishing.
   */
  noTest?: boolean;
}
