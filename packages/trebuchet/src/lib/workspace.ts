import {
  PackageJson,
  PackageJsonData,
  PackageName,
  PackageNameConstructable,
  PackageNameEqualityCheckOptions,
  PackageNameEqualityOperand,
  VscodeWorkspace,
  VscodeWorkspaceFolder,
} from '@bscotch/config';
import { Pathy, PathyOrString } from '@bscotch/pathy';
import { Project, ProjectExtractOptions } from '@bscotch/project';
import {
  keysOf,
  memoize,
  MemoizedClass,
  Trace,
  TracedClass,
} from '@bscotch/utility';
import { ok } from 'assert';
import path from 'path';
import { Repo } from './repo.js';
import {
  ProjectGraph,
  WorkspaceDependencyGraphOptions,
} from './workspace.depGraph.js';
import { extractProject } from './workspace.extract.js';
import { importProjectIntoWorkspace } from './workspace.import.js';
import {
  findPnpmWorkspaceConfig,
  findWorkspaceProjectByName,
  findWorkspaceProjectByPath,
  findWorkspaceProjectFuzzily,
  listWorkspaceProjects,
  workspaceIncludesProject,
} from './workspace.list.js';
import { moveWorkspaceProject } from './workspace.move.js';
import { publishProjects, versionProjects } from './workspace.publish.js';
import type {
  WorkspaceConfig,
  WorkspaceCreateProjectOptions,
  WorkspaceFindOptions,
  WorkspaceImportProject,
  WorkspaceOptions,
  WorkspacePublishOptions,
} from './workspace.types.js';
import {
  addWorkspaceFolderToVscodeConfig,
  getWorkspaceVscodeConfig,
} from './workspace.vscode.js';

export * from './workspace.schemas.js';
export * from './workspace.types.js';

const trace = Trace('@bscotch');

export interface Workspace extends TracedClass, MemoizedClass {}

/**
 * A representation of a Trebuchet-managed
 * monorepo "workspace".
 *
 * @alpha
 */
@trace
@memoize
export class Workspace extends Project<{ trebuchet?: WorkspaceConfig }> {
  private _repo?: Repo;

  constructor(options?: WorkspaceOptions) {
    super(options);
  }

  get repo() {
    this._repo ||= new Repo(this.dir);
    return this._repo;
  }

  /**
   * Returns the scope listed in the `package.json>trebuchet.npmScope` field, normalized to
   * ensure that it starts with a `@` character.
   */
  get npmScope(): string | undefined {
    const scope = this.packageJson.get('trebuchet')?.npmScope;
    if (!scope) {
      return;
    }
    return scope.startsWith('@') ? scope : `@${scope}`;
  }
  /**
   * Determine bump level for all changed
   * packages, bump them, update changelogs, and commit.
   *
   * Likely followed by a `.publishProjects()` call.
   */
  async versionProjects(options: WorkspacePublishOptions): Promise<Project[]> {
    return await versionProjects(this, options);
  }

  /**
   * Publish each project whose local `package.json` version
   * is greater than any found in the tags.
   */
  async publishProjects(options: WorkspacePublishOptions) {
    return await publishProjects.bind(this)(options);
  }

  /**
   * This this workspace have a turbo.json file (and is
   * thus assumed to be using turborepo)?
   */
  async hasTurbo() {
    return await this.dir.findChild('turbo.json');
  }

  /**
   * Compute the dependency graph for all of the
   * projects in this workspace.
   */
  async dependencyGraph(
    options?: WorkspaceDependencyGraphOptions,
  ): Promise<ProjectGraph> {
    return new ProjectGraph(await this.listProjects(), options);
  }

  /**
   * Show which projects are using which external
   * dependencies, and how often.
   *
   * This is useful for identifying unused dependencies,
   * or dependencies that you may want to replace with
   * local versions.
   */
  async externalDependencyUsage() {
    const depsUsage: {
      name: string;
      importCount: number;
      importedBy: { name: string; importCount: number }[];
    }[] = [];
    for (const project of await this.listProjects()) {
      const deps = await project.inferDependencies();
      const depNames = keysOf(deps.external || {}) as string[];
      for (const depName of depNames) {
        let depUsage: undefined | (typeof depsUsage)[number] = depsUsage.find(
          (d) => d.name === depName,
        );
        if (!depUsage) {
          depUsage = { name: depName, importCount: 0, importedBy: [] };
          depsUsage.push(depUsage);
        }
        depUsage.importCount += deps.external![depName].length;
        depUsage.importedBy.push({
          name: project.name.toString(),
          importCount: deps.external![depName].length,
        });
      }
    }
    depsUsage.sort((a, b) => b.importCount - a.importCount);
    return depsUsage;
  }

  /**
   * The blob patterns in the Workspace's root
   * `package.json` `"workspaces"` field, used
   * to determine the location of all "projects"
   * managed by the Workspace.
   *
   * If the root `package.json` has a sibling
   * `pnpm-workspace.yaml` file, its contents
   * will be used instead.
   */
  @memoize
  async projectGlobs(): Promise<string[]> {
    const globs = this.packageJson.workspaces || [];
    const pnpmWorkspaceConfig = await findPnpmWorkspaceConfig(this.dir);
    if (pnpmWorkspaceConfig) {
      return (await pnpmWorkspaceConfig.read()).packages;
    }
    return globs;
  }

  @memoize
  async vscodeWorkspaceConfig(): Promise<VscodeWorkspace | undefined> {
    return await getWorkspaceVscodeConfig.bind(this)();
  }

  /**
   * Add a folder to the workspace's VSCode config.
   */
  protected async addFolderToVscodeConfig(
    options: VscodeWorkspaceFolder & { dryRun?: boolean },
  ) {
    return await addWorkspaceFolderToVscodeConfig.bind(this)(options);
  }

  async createProject(options: WorkspaceCreateProjectOptions) {
    // Add name if not provided
    if (!options.name) {
      const name = path.basename(options.dir.replace(/[/\\]+$/, ''));
      options.name = this.npmScope ? `${this.npmScope}/${name}` : name;
    }
    if (!options.extendsTsconfigPath) {
      const rootTsConfig = this.dir.join('tsconfig.json');
      if (await rootTsConfig.exists()) {
        options.extendsTsconfigPath = rootTsConfig;
      }
    }

    const project = await Project.createProject(options);
    await this.addFolderToVscodeConfig({
      name: options.name,
      path: project,
    });

    // Ensure this project will appear in any cached
    // listings and other actions.
    this.clearMemoized();
    return project;
  }

  async importProject(options: WorkspaceImportProject) {
    return await importProjectIntoWorkspace.bind(this)(options);
  }

  async moveProject(project: Project, where: PathyOrString) {
    return await moveWorkspaceProject.bind(this)(project, where);
  }

  async extractNewProject(
    project: Project,
    options: ProjectExtractOptions,
  ): Promise<void> {
    return await extractProject.bind(this)(project, options);
  }

  /**
   * Rename a project, cascading the change to all
   * dependent projects and their source-code references.
   */
  async renameProject(project: Project, newName: PackageNameConstructable) {
    await this.hasProject(project, { assert: true });
    const oldName = project.name;
    const to = new PackageName(newName);
    const allProjects = await this.listProjects();
    const otherProjectUpdates: Promise<any>[] = [];
    if (!to.equals(oldName)) {
      await project.changeName(to);
      for (const otherProject of allProjects) {
        if (otherProject.equals(project)) {
          continue;
        }
        otherProjectUpdates.push(otherProject.renameDependency(oldName, to));
      }
    }
    // Update the Workspace to also use the new name.
    await this.packageJson.renameDependency(oldName, to);
    await Promise.all(otherProjectUpdates);
  }

  async hasProject(project: Project, options?: { assert?: boolean }) {
    return await workspaceIncludesProject.bind(this)(project, options);
  }

  /**
   * Find a local package using a fuzzy search.
   *
   * Can search by name (with or without scope)
   * or by path.
   */
  async findProjectFuzzily(
    nameOrPath: PathyOrString | PackageNameEqualityOperand,
  ): Promise<Project | undefined> {
    return await findWorkspaceProjectFuzzily.bind(this)(nameOrPath);
  }

  /**
   * Find a Project managed by this workspace,
   * by that Project's name.
   */
  @trace
  async findProjectByName(
    name: PackageNameEqualityOperand,
    options?: Pick<PackageNameEqualityCheckOptions, 'allowMissingScope'>,
  ): Promise<Project | undefined> {
    return await findWorkspaceProjectByName.bind(this)(name, options);
  }

  /**
   * Find a project managed by this workspace, by a
   * path contained within it (can be the project
   * directory itself).
   *
   * @param projectPath - Project path (either absolute or relative to the workspace root)
   */
  @trace
  async findProjectByPath(
    projectPath: string | Pathy,
  ): Promise<Project | undefined> {
    return await findWorkspaceProjectByPath.bind(this)(projectPath);
  }

  /**
   * List all Projects in this Workspace, as {@link}
   * Project instances. This makes use of the `workspaces`
   * field in the Workspace `package.json` file to
   * search for and identify all projects.
   *
   * Results are cached internally, so subsequent calls
   * do not have to re-search the filesystem.
   */
  @trace
  @memoize
  async listProjects(): Promise<Project[]> {
    return await listWorkspaceProjects.bind(this)();
  }

  /**
   * Given a path, is it possible for that
   * path to be a project root contained by
   * this Workspace?
   *
   * Globs in Workspace paths are limited and can
   * vary in meaning by workspace tooling. In
   * particular they tend to assume a single `packages`
   * folder with a collection of packages that all have
   * their root in that same folder.
   *
   * This method interprets the `workspaces` field
   * more liberally, assuming that the user intends
   * to have all of this automated as much as possible.
   *
   * In particular:
   *
   * - Every entry is parsed for a root directory
   * - Each discovered root directory is treated as
   * a directory in which packages can be found at
   * any arbitrary depth (no nesting, though!)
   *
   * Determined via the `package.json`
   * `"workspaces"` field.
   */
  @trace
  async projectsRoots(): Promise<Pathy[]> {
    if (!(await this.projectGlobs()).length) {
      return [];
    }
    if ((await this.projectGlobs()).includes('*')) {
      return [this.dir];
    }
    const dirs: Pathy[] = [];
    for (const pattern of await this.projectGlobs()) {
      const [root] = pattern.replace(/^\.\//, '').split('/');
      const dir = new Pathy(root, this.dir);
      if (!dirs.find((d) => d.equals(dir))) {
        dirs.push(dir);
      }
    }
    return dirs;
  }

  @memoize
  protected get config(): WorkspaceConfig {
    if (!this.packageJson.get('trebuchet')) {
      void this.packageJson.set('trebuchet', {});
    }
    return this.packageJson.get('trebuchet')!;
  }

  protected async updateConfig<F extends keyof WorkspaceConfig>(
    field: F,
    value: WorkspaceConfig[F],
  ): Promise<void> {
    this.config[field] = value;
    await this.packageJson.save();
  }

  /**
   * Find a workspace, starting from
   * some path within it, and create a corresponding
   * {@link Workspace} instance.
   */
  @trace
  static async findWorkspace(
    options?: WorkspaceFindOptions,
  ): Promise<Workspace> {
    const nearestPkg = await new Pathy(
      options?.fromPath || process.cwd(),
    ).findInParents<PackageJsonData>('package.json', {
      test: async (foundPath) => {
        // Any pnpm workspace sibling defs?
        const pnpmWorkspaceConfig = await findPnpmWorkspaceConfig(
          foundPath.up(),
        );
        const isWorkspace =
          pnpmWorkspaceConfig || (await foundPath.read()).workspaces;
        return !!isWorkspace;
      },
    });
    ok(nearestPkg, 'No package.json found');
    const pkg = new PackageJson({
      path: nearestPkg,
      data: await nearestPkg.read(),
    });
    return new Workspace({ dir: pkg.dir, packageJson: pkg });
  }
}
