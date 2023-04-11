#!/usr/bin/env node

import { ProjectCreateOptions, projectCreateSchema } from '@bscotch/project';
import { keysOf, pick, pointable } from '@bscotch/utility';
import { ok } from 'assert';
import JSON5 from 'json5';
import { stringify as yamlStringify } from 'yaml';
import {
  workspaceExternalDepsSchema,
  WorkspaceImportProject,
  workspaceImportSchema,
  WorkspaceListOptions,
  workspaceListSchema,
  WorkspacePublishOptions,
  workspacePublishSchema,
} from '../lib/workspace.js';
import { trebCommit } from './treb.commit.js';
import { TrebCli } from './treb.lib.js';
import {
  projectOptions,
  TrebuchetExtractOptions,
  trebuchetExtractSchema,
  TrebuchetFixOptions,
  trebuchetFixSchema,
  TrebuchetMoveFilesOptions,
  trebuchetMoveFilesSchema,
  TrebuchetMoveOptions,
  trebuchetMoveSchema,
  trebuchetProjectOption,
  TrebuchetRenameOptions,
  trebuchetRenameSchema,
  TrebuchetTestOptions,
  trebuchetTestSchema,
  updateJsonOptionsSchema,
} from './treb.schema.js';

const treb = new TrebCli({
  name: 'treb',
  description: 'Trebuchet: Manage Typescript monorepos with ease.',
});

treb
  .addCommand(
    'commit',
    'Make a commit via an interactive prompt.',
    {},
    async (workspace) => {
      await trebCommit(workspace);
    },
  )
  .addCommand(
    'version',
    'Bump the versions of changed projects. Uses Git tags to determine which projects have changed, bumps dependents of changed projects. (TODO: write changelogs.)',
    workspacePublishSchema,
    async (workspace, _, options: WorkspacePublishOptions) => {
      await workspace.versionProjects(options);
    },
  )
  .addCommand(
    'publish',
    'Publish projects that have had their versions bumped compared to the latest published version.',
    workspacePublishSchema,
    async (workspace, _, options: WorkspacePublishOptions) => {
      await workspace.publishProjects(options);
    },
  )
  .addCommand(
    'fix',
    'Fix project source',
    trebuchetFixSchema,
    async (_, project, options: TrebuchetFixOptions) => {
      await project!.fixSourceFiles(options);
    },
  )
  .addCommand(
    'test',
    'Run tests using Mocha.',
    trebuchetTestSchema,
    async (_, project, options: TrebuchetTestOptions) => {
      await project!.test(options);
    },
  )
  .addCommand(
    'move',
    'Move a project while automatically updating as many references as possible.',
    trebuchetMoveSchema,
    async (workspace, project, options: TrebuchetMoveOptions) => {
      await workspace.moveProject(project!, options.to);
      await workspace.packageJson.install(project!.packageJson);
    },
  )
  .addCommand(
    'extract',
    'Extract a new project from an existing one.',
    trebuchetExtractSchema,
    async (workspace, project, options: TrebuchetExtractOptions) => {
      ok(project, `Project not found`);
      await workspace.extractNewProject(project, options);
    },
  )
  .addCommand(
    'import',
    'Import an external project into the workspace.',
    workspaceImportSchema,
    async (workspace, project, options: WorkspaceImportProject) => {
      await workspace.importProject(options);
    },
  )
  .addCommand(
    'rename',
    'Rename a package, propagating that change to all dependents. Consider this an unsafe operation!',
    trebuchetRenameSchema,
    async (workspace, project, options: TrebuchetRenameOptions) => {
      await workspace.renameProject(project!, options.name);
      await workspace.packageJson.install(project!.packageJson);
    },
  )
  .addCommand(
    'move-files',
    'Rename files, using Typescript to automatically update references.',
    trebuchetMoveFilesSchema,
    async (_, project, options: TrebuchetMoveFilesOptions) => {
      await project!.moveFiles({
        match: new RegExp(options.match),
        rename: options.rename,
        dryRun: options.dryRun,
      });
    },
  )
  .addCommand(
    'list',
    'List projects',
    workspaceListSchema,
    async (workspace, _, options: Required<WorkspaceListOptions>) => {
      const projects = (await workspace.listProjects())?.filter(
        (project) => !options?.publishable || project.packageJson.isPublishable,
      );
      const output = projects.map((p) => {
        const cleanedUp = {
          dir: p.dir[options.absolutePaths ? 'absolute' : 'relative'],
          name: p.name.toString(),
        };
        if (options.excludeScopes) {
          cleanedUp.name = cleanedUp.name.replace(/^@[^/]+\//, '');
        }
        return pick(cleanedUp, options.includeProperties);
      });
      if (options.format === 'table') {
        console.table(output);
      } else if (options.format === 'json') {
        console.log(JSON.stringify(output));
      } else {
        for (const p of output) {
          console.log(
            options.includeProperties.map((prop) => p[prop]).join('\t'),
          );
        }
      }
    },
  )
  .addCommand(
    'list-entrypoints',
    'List all inferred entrypoints for a project, in the order they would need to be built or extracted.',
    trebuchetProjectOption,
    async (_, project) => {
      const files = await project!.listEntrypoints();
      console.log(files.join('\n'));
    },
  )
  .addCommand(
    'list-external-deps',
    'List all external dependencies.',
    workspaceExternalDepsSchema,
    async (workspace) => {
      const dependencies = await workspace.externalDependencyUsage();
      // Include those in the root
      const rootDeps = workspace.packageJson.flattenedDependencies();
      for (const depName of keysOf(rootDeps)) {
        if (
          !dependencies.find(
            (dep) => dep.name === depName.replace(/^@types\//, ''),
          )
        ) {
          dependencies.push({
            name: depName,
            importCount: 0,
            importedBy: [],
          });
        }
      }
      console.log(yamlStringify(dependencies));
    },
  )
  .addCommand(
    'update-json',
    'Update a JSON or YAML file. Useful for enforcing a common field value in configuration files.',
    projectOptions(updateJsonOptionsSchema),
    async (_, project, options) => {
      const file = await project!.dir.findChild(options.file);
      if (!file) {
        console.warn(
          `File ${options.file} not found in project ${project!.name}`,
        );
        return;
      }
      const json = await file.read();
      let value = options.value as any;
      try {
        value = JSON5.parse(value);
      } catch {
        value = JSON5.parse(JSON5.stringify(value));
      }
      pointable(json).at(options.pointer).set(value);
      console.log('Updated file in project', project!.name.toString());
      await file.write(json);
    },
  )
  .addCommand(
    'create',
    'Create a new Project',
    projectCreateSchema,
    async (workspace, _, options: ProjectCreateOptions) => {
      await workspace.createProject(options);
    },
  )
  .parse();
