import { merge } from '@bscotch/utility';
import { JsonSchema } from '@bscotch/validation';
import {
  WorkspaceExternalDepsOptions,
  WorkspaceImportProject,
  WorkspaceListOptions,
  WorkspacePublishOptions,
  WorkspaceVersionOptions,
} from './workspace.types.js';

export const workspaceExternalDepsSchema: JsonSchema<WorkspaceExternalDepsOptions> =
  {};

export const workspaceListSchema: JsonSchema<WorkspaceListOptions> = {
  $id: '/workspace-list-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  title: 'Workspace List Options',
  properties: {
    publishable: {
      type: 'boolean',
      description: 'List only publishable projects.',
      default: false,
    },
    format: {
      enum: ['json', 'table', 'plain'],
      description: 'How the output should be formatted.',
      default: 'plain',
    },
    includeProperties: {
      type: 'array',
      description: 'List of properties to include in the output.',
      items: {
        enum: ['dir', 'name'],
      },
      default: ['dir'],
    },
    absolutePaths: {
      type: 'boolean',
      description:
        'Whether to print absolute paths. Otherwise paths are relative to cwd.',
      default: false,
    },
    excludeScopes: {
      type: 'boolean',
      description:
        'When listing names, scopes are included by default. This can create noise in some contexts, so scopes can be excluded.',
      default: false,
    },
  },
} as const;

export const workspaceVersioningSchema: JsonSchema<WorkspaceVersionOptions> = {
  $id: '/workspace-versioning-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  properties: {
    bump: {
      enum: ['major', 'minor', 'patch'],
      description:
        'The bump type is inferred from the git logs, but can be forced by setting this value.',
    },
    noCommit: {
      type: 'boolean',
      description:
        'If true, then no commit will be made after updating the `package.json` files. This is useful for testing or adding a manual review step.',
    },
    noPush: {
      type: 'boolean',
      description:
        "If true, then no push will be made to the remote. This is forced to be `true` if `noCommit` is true, since in that case there's nothing to push!",
    },
  },
};

export const workspacePublishSchema: JsonSchema<WorkspacePublishOptions> =
  merge(workspaceVersioningSchema, {
    $id: '/workspace-publish-options',
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    properties: {
      noPull: {
        type: 'boolean',
      },
      noRebuild: {
        type: 'boolean',
      },
      noTag: {
        type: 'boolean',
        description:
          'If true, then no tag will be added to the resulting commit. This is forced to be `true` if `noCommit` is true.',
      },
      noTest: {
        type: 'boolean',
      },
    },
  });

export const workspaceImportSchema: JsonSchema<WorkspaceImportProject> = {
  $id: '/workspace-import-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  title: 'Workspace Import Project',
  properties: {
    from: {
      type: 'string',
      description: 'The path to the project to import.',
    },
    to: {
      type: 'string',
      description: 'The path within the workspace to import the project to.',
    },
    dryRun: {
      type: 'boolean',
      description:
        'If true, then the actions that *would* be taken will be reported, but not changes will be made to disk.',
      default: false,
    },
  },
  required: ['from', 'to'],
};
