import { Project } from '@bscotch/project';
import { useTracer } from '@bscotch/utility';
import { JsonSchema, JsonSchemaNode, validate } from '@bscotch/validation';
import { Static, TObject } from '@sinclair/typebox';
import { ok } from 'assert';
import { Command } from 'commander';
import { dirname } from 'path';
import { Promisable } from 'type-fest';
import { fileURLToPath } from 'url';
import { Workspace } from '../index.js';

export type TrebuchetCommandOptions = Record<string, any> | undefined;

const trace = useTracer('@bscotch:TrebCli');

const dir = dirname(fileURLToPath(import.meta.url));

function asStringOrBoolean(value: any) {
  return typeof value === 'boolean' ? value : `${value}`;
}

export class TrebCli {
  protected program: Command;
  constructor(options: { name: string; description?: string }) {
    this.program = new Command(options.name);
    this.program.executableDir(dir);
    if (options.description) {
      this.program.description(options.description);
    }
  }

  addCommand<Schema extends TObject<any>, Options extends Static<Schema>>(
    name: string,
    description: string,
    schema: Schema,
    action: (
      workspace: Workspace,
      project: Project | undefined,
      options: Options,
    ) => Promisable<any>,
  ): TrebCli;
  addCommand<Options extends Record<string, any>>(
    name: string,
    description: string,
    schema: JsonSchema<Options>,
    action: (
      workspace: Workspace,
      project: Project | undefined,
      options: Options,
    ) => Promisable<any>,
  ): TrebCli;
  addCommand<Options extends Record<string, any>>(
    name: string,
    description: string,
    schema: JsonSchema<Options>,
    action: (
      workspace: Workspace,
      project: Project | undefined,
      options: Options,
    ) => Promisable<any>,
  ): TrebCli {
    const command = this.program.command(name).description(description);
    const schemaNode = new JsonSchemaNode(schema);

    for (const property of schemaNode.properties() || []) {
      let input = `--${property.key}`;
      if (property.type() !== 'boolean') {
        input += ` <${property.key}${
          property.type() === 'array' ? '...' : ''
        }>`;
      } else {
        input += ' [true|false]';
      }
      const defaultValue = property.default();
      command[property.isRequired() ? 'requiredOption' : 'option'](
        input,
        property.description,
        defaultValue !== undefined
          ? asStringOrBoolean(defaultValue)
          : undefined,
      );
    }

    command.action(async (options: Options) => {
      trace('provided options: %o', options);
      validate(schema, options);
      const workspace = await Workspace.findWorkspace({
        fromPath: process.cwd(),
      });
      process.chdir(workspace.dir.absolute);
      const projects: Project<any>[] = [];
      if (options.allProjects) {
        projects.push(...(await workspace.listProjects()));
      } else if ('targetProject' in options) {
        const project = await workspace.findProjectFuzzily(
          options.targetProject,
        );
        ok(project, `Project "${options.targetProject}" not found.`);
        projects.push(project);
      }
      if (options.includeRoot) {
        projects.push(workspace);
      }
      for (const project of projects) {
        const cwd = process.cwd();
        if (project) {
          process.chdir(project.dir.absolute);
        }
        await action(workspace, project, options);
        process.chdir(cwd);
      }
      if (!projects.length) {
        await action(workspace, undefined, options);
      }
    });
    return this;
  }

  parse(): void {
    this.program.parse();
  }
}

// prettifyErrorTracing({
//   replaceFilePaths:
//     process.env.BSCOTCH_REPO === '@bscotch/tech'
//       ? [
//           {
//             pattern: /^(.*[\\/])node_modules[\\/]@bscotch([\\/].+)$/,
//             replacer: '$1projects$2',
//           },
//         ]
//       : undefined,
// });
