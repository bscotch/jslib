/**
 * A helper class for parsing and managing a `tsconfig.json` file.
 *
 * Follows project references and discovers configs this one extends.
 */

import { Pathy, PathyOrString } from '@bscotch/pathy';
import { memoize, Trace, type TracedClass } from '@bscotch/utility';
import { ok } from 'assert';
import { globby } from 'globby';
import type { ConfigFileOptions } from './configFile.js';
import { ConfigFile } from './configFile.js';
import type { TsConfigJson } from './tsConfig.types.js';

const trace = Trace('@bscotch');

export interface TsConfig extends TracedClass {}

@trace
export class TsConfig<
  Config extends TsConfigJson = TsConfigJson,
> extends ConfigFile<Config> {
  constructor(options: Omit<ConfigFileOptions<Config>, 'defaultBaseName'>) {
    super({ defaultBasename: 'tsconfig.json', ...options });
  }

  /**
   * The list of paths references in the config's
   * "references" field.
   */
  get referencePaths(): string[] {
    return (this.data.references || []).map((ref) =>
      Pathy.ensureAbsolute(ref.path, this.dir),
    );
  }

  async compilerOptions() {
    const cumulativeConfig = await this.cumulativeConfig();
    return { ...cumulativeConfig.compilerOptions };
  }

  /**
   * Compute the output directory, based on the `outDir` value
   * of the current and any parent configs.
   */
  @trace
  async outDir(): Promise<Pathy> {
    const config = await this.cumulativeConfig();
    const outDir = config.compilerOptions?.outDir || this.dir;
    return new Pathy(outDir, this.dir);
  }

  async baseUrl(): Promise<Pathy> {
    const config = await this.cumulativeConfig();
    const baseUrl = new Pathy(
      config.compilerOptions!.baseUrl! || this.dir,
      this.dir,
    );
    return baseUrl;
  }

  async srcDir(): Promise<Pathy> {
    const config = await this.cumulativeConfig();
    const srcDir = config.compilerOptions?.rootDir || this.dir;
    return new Pathy(srcDir, this.dir);
  }

  async aliases(): Promise<{ [key: string]: string[] }> {
    const cumulativeConfig = await this.cumulativeConfig();
    // @ts-ignore
    return { ...(cumulativeConfig.compilerOptions?.paths || {}) };
  }

  @memoize
  async sourceFiles(): Promise<Pathy[]> {
    const config = await this.cumulativeConfig();
    const includesAbsolutePatterns = [
      ...(config.include || []),
      ...(config.files || []),
    ].map((p) => this.dir.join(p).absolute);
    const excludesAbsolutePatterns = (config.exclude || []).map(
      (p) => `!${this.dir.join(p).absolute}`,
    );
    const matchingPaths = await globby(
      [...includesAbsolutePatterns, ...excludesAbsolutePatterns],
      { cwd: this.dir.absolute },
    );
    return matchingPaths.map((p) => new Pathy(p, this.dir.absolute));
  }

  /**
   * Test a path to see if it is included by the
   * config. Resolves aliases specified by
   * `compilerOptions.paths`. Returns `undefined` unless
   * `path` is one of:
   *
   * - An absolute path to a file included by the config
   * - A path relative to the tsconfig file, and included by the config
   * - An aliased path that resolves to a path included by the config
   *
   * If any of the above are true, returns the path to the
   * path to the included file.
   */
  async includes(
    path: string,
    options?: {
      /**
       * If `true` and `path` is not found in this config,
       * any referenced projects will also be checked
       * (recursively) for `path`.
       */
      searchProjectReferences: boolean;
      /**
       * By default the working directory the path is relative
       * to is assumed to be the tsconfig's directory.
       * You can override this.
       */
      cwd?: Pathy;
    },
  ): Promise<Pathy | undefined> {
    const aliases = await this.aliases();
    const cwd = options?.cwd || this.dir;
    let resolvedPath = new Pathy(path, cwd);
    for (const [alias, paths] of Object.entries(aliases)) {
      const aliasPrefix = alias.replace(/\*$/, '');
      if (!path.startsWith(aliasPrefix)) {
        continue;
      }
      // Then it's an aliased path
      resolvedPath = this.dir.join(
        await this.baseUrl(),
        `${paths[0].replace(/\*$/, '')}${path.substring(aliasPrefix.length)}`,
      );
      break;
    }
    let isIncluded = (await this.sourceFiles()).find((f) =>
      f.equals(resolvedPath),
    );
    if (!isIncluded && options?.searchProjectReferences) {
      const refs = await this.resolveProjectReferenceTree();
      for (const ref of refs.slice(1)) {
        isIncluded = await ref.includes(path, {
          cwd,
          searchProjectReferences: true,
        });
        if (isIncluded) {
          return isIncluded;
        }
      }
    }
    return isIncluded;
  }

  /**
   * A tsconfig file can have a `references` array, which
   * can point to other tsconfig files. This feature is
   * poorly implemented by many typescript tools, so being
   * able to resolve the entire tree from a starting point
   * can be useful to assist such tools.
   *
   * Returns a flat array for easy iteration. The first
   * element is the current config.
   */
  @memoize
  async resolveProjectReferenceTree(): Promise<TsConfig[]> {
    const allRefs: TsConfig[] = [this];

    const innerLoop = async (config: TsConfig) => {
      const waits = config.referencePaths.map((path) =>
        TsConfig.resolve(this.dir.resolveTo(path)).then((refConfig) => {
          allRefs.push(refConfig);
          return innerLoop(refConfig);
        }),
      );
      await Promise.all(waits);
    };
    await innerLoop(this);

    return allRefs;
  }

  @trace
  @memoize
  async cumulativeConfig(): Promise<Config> {
    this.trace('resolving inheritence chain');
    const chain = await this.inheritenceChain();
    let cumulativeConfig = { compilerOptions: {}, ...chain[0].config };
    for (let i = 1; i < chain.length; i++) {
      // All root-level items clobber, except for compilerOptions
      // which clobber at their root level. Project references are
      // not passed down.
      delete cumulativeConfig.extends;
      delete cumulativeConfig.references;
      //
      const currentConfig = chain[i].config;
      const currentCompilerOptions = currentConfig.compilerOptions;
      const priorCompilerOptions: Config['compilerOptions'] =
        cumulativeConfig.compilerOptions!;

      // Can resolve the baseUrl and rootDir relative to the
      // default of the same location as the tsconfig file.
      const directory = chain[i].path.directory;
      const parentConfigDirectory = chain[i - 1].path.directory;
      const bases: { baseUrl?: string; rootDir?: string } = {};
      for (const key of ['baseUrl', 'rootDir'] as const) {
        bases[key] =
          (currentCompilerOptions?.[key] &&
            Pathy.resolve(directory, currentCompilerOptions[key]!)) ||
          Pathy.resolve(
            parentConfigDirectory,
            priorCompilerOptions?.[key] || '',
          );
      }

      // The `outDir` resolves relative to the root *wherever it is
      // specified*.
      const outDir =
        (currentCompilerOptions?.outDir &&
          Pathy.resolve(directory, currentCompilerOptions.outDir)) ||
        Pathy.resolve(
          parentConfigDirectory,
          priorCompilerOptions.outDir || '.',
        );

      cumulativeConfig = {
        ...cumulativeConfig,
        ...currentConfig,
        compilerOptions: {
          ...priorCompilerOptions,
          ...currentCompilerOptions,
          ...bases,
          outDir,
        },
      };
    }
    return cumulativeConfig;
  }

  /**
   * Given a path that might be a directory or
   * a full path to a tsconfig file, resolve the file
   * and load it into an instance.
   */
  static async resolve(path: PathyOrString = process.cwd()): Promise<TsConfig> {
    let configPath = Pathy.asInstance(path);
    if (await configPath.isDirectory()) {
      configPath = configPath.resolveTo('tsconfig.json');
    }
    ok(await configPath.isFile(), `Could not find tsconfig file at ${path}`);
    return new TsConfig({ path: configPath, data: await configPath.read() });
  }
}
