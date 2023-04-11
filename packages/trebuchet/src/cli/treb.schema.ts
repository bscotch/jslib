import {
  ProjectExtractOptions,
  projectExtractSchema,
  ProjectFixOptions,
  projectFixSchema,
  ProjectMoveFilesOptions,
  projectMoveFilesSchema,
  ProjectMoveOptions,
  projectMoveSchema,
  ProjectRenameOptions,
  projectRenameSchema,
  projectTestingSchema,
  ProjectTestOptions,
} from '@bscotch/project';
import { merge } from '@bscotch/utility';
import { JsonSchema } from '@bscotch/validation';
import { TProperties, Type as t } from '@sinclair/typebox';

export interface TrebuchetProjectTargetOptions {
  targetProject?: string;
  allProjects?: boolean;
  includeRoot?: boolean;
}

const projectTargetOptionsSchema = {
  targetProject: t.Optional(t.String()),
  allProjects: t.Optional(t.Boolean()),
  includeRoot: t.Optional(t.Boolean()),
};

export function projectOptions<S extends TProperties>(schema: S) {
  return t.Object({
    ...schema,
    ...projectTargetOptionsSchema,
  });
}

export const updateJsonOptionsSchema = {
  file: t.String({
    description:
      "The name of the file to update, relative to the project's root.",
    pattern: '.*\\.(json|yaml|yml)$',
  }),
  pointer: t.String({
    description:
      'A JSON pointer to the field to update. Note that in some shells (e.g. bash) a value starting with a `/` is interpreted as a slash -- just add another slash to escape it. E.g. "/your/pointer" becomes "/your/pointer".',
  }),
  value: t.String({
    description: 'The value to set the field to. Parsed using JSON5.',
  }),
};

export interface TrebuchetExtractOptions
  extends ProjectExtractOptions,
    TrebuchetProjectTargetOptions {}

export interface TrebuchetFixOptions
  extends ProjectFixOptions,
    TrebuchetProjectTargetOptions {}

export interface TrebuchetMoveFilesOptions
  extends ProjectMoveFilesOptions,
    TrebuchetProjectTargetOptions {}

export interface TrebuchetMoveOptions
  extends ProjectMoveOptions,
    TrebuchetProjectTargetOptions {}

export interface TrebuchetRenameOptions
  extends ProjectRenameOptions,
    TrebuchetProjectTargetOptions {}

export interface TrebuchetTestOptions
  extends ProjectTestOptions,
    TrebuchetProjectTargetOptions {}

export const trebuchetProjectOption: JsonSchema<TrebuchetProjectTargetOptions> =
  {
    type: 'object',
    properties: {
      targetProject: {
        type: 'string',
        description:
          'The name of the project against which to run the command. Uses fuzzy matching: can be a path or a partial package name.',
        default: process.cwd(),
      },
      allProjects: {
        type: 'boolean',
        description:
          'Run the command on all projects. Not supported by all commands.',
        default: false,
      },
      includeRoot: {
        type: 'boolean',
        description:
          'Run the command on the root project. Not supported by all commands.',
        default: false,
      },
    },
  };

export const trebuchetExtractSchema: JsonSchema<TrebuchetExtractOptions> =
  merge(trebuchetProjectOption, projectExtractSchema);

export const trebuchetFixSchema: JsonSchema<TrebuchetFixOptions> = merge(
  trebuchetProjectOption,
  projectFixSchema,
);

export const trebuchetMoveFilesSchema: JsonSchema<TrebuchetMoveFilesOptions> =
  merge(trebuchetProjectOption, projectMoveFilesSchema);

export const trebuchetMoveSchema: JsonSchema<TrebuchetMoveOptions> = merge(
  trebuchetProjectOption,
  projectMoveSchema,
);

export const trebuchetRenameSchema: JsonSchema<TrebuchetRenameOptions> = merge(
  trebuchetProjectOption,
  projectRenameSchema,
);

export const trebuchetTestSchema: JsonSchema<TrebuchetTestOptions> = merge(
  trebuchetProjectOption,
  projectTestingSchema,
);
