import { merge } from '@bscotch/utility';
import { JsonSchema } from '@bscotch/validation';
import { cpus } from 'os';
import {
  ProjectCreateOptions,
  ProjectExtractOptions,
  ProjectFixOptions,
  ProjectMoveFilesOptions,
  ProjectMoveOptions,
  ProjectRenameOptions,
  ProjectTestOptions,
} from './project.types.js';

export const projectNameSchema: JsonSchema<string> = {
  type: 'string',
  title: 'Project Name',
  description:
    'The name of the project, in npm-package style, with its scope if appropriate',
  pattern:
    '^(@(?<scope>[a-z0-9-_]+)/)?(?<unscoped>[a-z0-9-_.]+)(@(?<version>[a-z0-9._-]+))?$',
};

export const projectCreateSchema: JsonSchema<ProjectCreateOptions> = {
  $id: '/project-create',
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  title: 'Create a new Project',
  properties: {
    dir: {
      type: 'string',
      description: 'The directory to create the project in',
    },
    name: projectNameSchema,
    version: {
      type: 'string',
      description:
        'The initial version of the new project. Must be a valid semver string',
      default: '0.1.0',
    },
    outDir: {
      type: 'string',
      description: 'Output folder for built files',
      default: 'dist',
    },
    srcDir: {
      type: 'string',
      description: 'Source folder for Typescript (unbuilt) files',
      default: 'src',
    },
    extendsTsconfigPath: {
      type: 'string',
      description:
        "Path to a tsconfig.json file to use as basis for this project's tsconfig.json",
    },
    dryRun: {
      type: 'boolean',
    },
  },
  required: ['dir'],
};

export const projectExtractSchema: JsonSchema<ProjectExtractOptions> = merge(
  projectCreateSchema,
  {
    $id: '/project-extract-options',
    $schema: 'http://json-schema.org/draft-07/schema',
    type: 'object',
    title: 'Project Extract Options',
    properties: {
      entrypoints: {
        type: 'array',
        items: {
          type: 'string',
        },
        description:
          'List of entrypoints to extract from the project. Folder entrypoints will cause all children to be extracted, while file entrypoints will cause all prefix-matching siblings to be extracted.',
      },
      dryRun: {
        type: 'boolean',
        default: false,
        description: 'If true, the extractor will not write any files to disk.',
      },
    },
    required: ['entrypoints'],
  },
);

export const projectFixSchema: JsonSchema<ProjectFixOptions> = {
  $id: '/project-fix-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  type: 'object',
  title: 'Project Fix Options',
  properties: {
    // removeUnusedIdentifiers: {
    //   type: 'boolean',
    // },
    addMissingImports: {
      type: 'boolean',
    },
    resolveModulePaths: {
      description:
        'Ensure all non-external import statements use paths with extensions. This allows converting Node-style resolution to module-style resolution, where in the latter all paths must point directly to a file.',
      type: 'boolean',
    },
    organizeImports: {
      type: 'boolean',
    },
    packageJson: {
      type: 'boolean',
    },
    // enforceInfixPatternEntrypoint: {
    //   type: 'boolean',
    //   description:
    //     'If true, files with infixes (e.g. `file.infix.ts`) are only allowed to be imported by files with the same pre-infix basename (e.g. `file.test.ts` can import `file.ts` or `file.infix.ts`, and `otherfile.ts` can import from `file.ts` but not `file.infix.ts`). This helps to keep clean APIs while allowing automation of file management.',
    // },
  },
};

export const projectMoveSchema: JsonSchema<ProjectMoveOptions> = {
  $id: '/project-move-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  title: 'Project Move Options',
  type: 'object',
  properties: {
    to: {
      type: 'string',
      description: 'The new project root directory.',
    },
  },
  required: ['to'],
};

export const projectMoveFilesSchema: JsonSchema<ProjectMoveFilesOptions> = {
  $id: '/project-move-files-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  title: 'Project Move Files Options',
  type: 'object',
  properties: {
    match: {
      type: 'string',
      format: 'regex',
      description:
        'The regex pattern to use to identify files to rename. Tested against each filepath in the project, where that filepath is relative to the project root and does not have a "./" prefix.',
    },
    rename: {
      type: 'string',
      description:
        "The new name for matching files. Uses JavaScript's `String.replace()` function, so you can reference capture groups from your match pattern.",
    },
  },
  required: ['match', 'rename'],
};

export const projectRenameSchema: JsonSchema<ProjectRenameOptions> = {
  $id: '/project-rename-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  title: 'Project Rename Options',
  type: 'object',
  properties: {
    name: {
      type: 'string',
      description: 'The new package name.',
    },
  },
  required: ['name'],
};

export const projectTestingSchema: JsonSchema<ProjectTestOptions> = {
  $id: '/project-test-options',
  $schema: 'http://json-schema.org/draft-07/schema',
  title: 'Project Test Options',
  type: 'object',
  properties: {
    allowUncaught: {
      description: 'Propagate uncaught errors?',
      type: 'boolean',
      default: false,
    },
    asyncOnly: {
      description: 'Force `done` callback or promise?',
      type: 'boolean',
      default: false,
    },
    bail: {
      description: 'bail on the first test failure.',
      type: 'boolean',
      default: false,
    },
    checkLeaks: {
      description: 'Check for global variable leaks?',
      type: 'boolean',
      default: false,
    },
    color: {
      description: 'Color TTY output from reporter',
      type: 'boolean',
      default: false,
    },
    delay: {
      description: 'Delay root suite execution?',
      type: 'boolean',
      default: false,
    },
    diff: {
      description: 'Show diff on failure?',
      type: 'boolean',
      default: false,
    },
    dryRun: {
      description: 'Report tests without running them?',
      type: 'boolean',
      default: false,
    },
    fgrep: {
      type: 'string',
      description: 'Test filter given string.',
    },
    forbidOnly: {
      description: 'Tests marked `only` fail the suite?',
      type: 'boolean',
      default: true,
    },
    forbidPending: {
      description: 'Pending tests fail the suite?',
      type: 'boolean',
      default: false,
    },
    fullTrace: {
      description: 'Full stacktrace upon failure?',
      type: 'boolean',
      default: false,
    },
    inlineDiffs: {
      description: 'Display inline diffs?',
      type: 'boolean',
      default: false,
    },
    invert: {
      description: 'Invert test filter matches?',
      type: 'boolean',
      default: false,
    },
    noHighlighting: {
      description: 'Disable syntax highlighting?',
      type: 'boolean',
      default: false,
    },
    retries: {
      description: 'Number of times to retry failed tests.',
      type: 'number',
    },
    slow: {
      description: 'Slow threshold value.',
      type: 'number',
    },
    timeout: {
      description: 'Timeout threshold value.',
      type: 'number',
    },
    parallel: {
      description: 'Run jobs in parallel',
      type: 'boolean',
      default: true,
    },
    jobs: {
      description: 'Max number of worker processes for parallel runs.',
      type: 'number',
      default: cpus().length * 2,
    },
  },
};
