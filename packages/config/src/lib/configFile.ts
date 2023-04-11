import type { PathyWriteOptions } from '@bscotch/pathy';
import { Pathy } from '@bscotch/pathy';
import { clone, Trace, TracedClass } from '@bscotch/utility';
import { ok } from 'assert';
import { readFileSync } from 'fs';
import json5 from 'json5';
import type { ConfigFileOptions } from './configFile.types.js';

export type { ConfigFileOptions } from './configFile.types.js';

const trace = Trace('@bscotch');

export interface ConfigFile<Config extends Record<string, any>>
  extends TracedClass {}

/**
 * Generic helper class for reading, saving, and performing
 * common tasks related to a JSON-serializable config file.
 *
 * Useful as a base class for more specific config file types.
 *
 * @example
 * // Synchronously loads from disk if data isn't provided
 * const myConfig = new ConfigFile<{hello:'world'}>({path:'my-config.json'});
 *
 */
@trace
export class ConfigFile<Config extends Record<string, any>> {
  protected data: Config;

  /**
   * The full path of the file.
   */
  readonly path: Pathy;

  /**
   * See {@link ConfigFileOptions.defaultBasename}
   */
  readonly defaultBasename: string;

  /**
   * Construct an instance from the contents and location of
   * a config file.
   */
  constructor(options: ConfigFileOptions<Config>) {
    ok(
      options.path ||
        (options.dir && (options.basename || options.defaultBasename)),
      'Must provide a path, or a dir and a default or specific basename',
    );
    this.trace('constructor args: %o', options);
    this.path =
      (options.path && Pathy.asInstance(options.path)) ||
      Pathy.asInstance(options.dir!).resolveTo(
        (options.basename || options.defaultBasename)!,
      );
    this.path = new Pathy(this.path, this.dir);
    this.defaultBasename = options.defaultBasename || this.basename;
    this.data =
      options?.data || json5.parse(readFileSync(this.path.toString(), 'utf8'));
  }

  get basename() {
    return this.path.basename;
  }

  get dir() {
    return this.path.up();
  }

  /**
   * Get or set the *extends* field, a common
   * field found on many config files.
   */
  async extends(): Promise<Pathy>;
  async extends(parent: Pathy): Promise<this>;
  async extends(parent?: Pathy) {
    if (parent) {
      // @ts-expect-error 'extends' is not present in the generic
      this.data.extends = this.dir.relativeTo(parent);
      await this.save();
      return this;
    }
    return this.data.extends && new Pathy(this.data.extends, this.dir);
  }

  /**
   * Many kinds of configs include an "extends" field, which
   * is a relative path from that file to another config file
   * of the same type.
   *
   * This function resolves the "extends" chain,
   * returning an array of config instances starting from the root
   * and ending with this instance.
   */
  async inheritenceChain(): Promise<{ path: Pathy; config: Config }[]> {
    // Grab the constructor from the current instance, so that
    // if it has been extended from the base class we use the extended
    // class constructor.
    const defaultBasename = this.defaultBasename;
    let currentConfig = this.data as { extends?: string };
    let currentConfigDir = this.dir;
    const chain: { path: Pathy; config: Config }[] = [
      { path: this.path, config: clone(this.data) },
    ];
    while (currentConfig.extends && typeof currentConfig.extends === 'string') {
      // The basename is often missing, so try with & without
      let parentPath = currentConfigDir.resolveTo(currentConfig.extends);
      const resolvedPathWaits = ['', defaultBasename].map(async (basename) => {
        const path = parentPath.resolveTo(basename);
        return (await path.exists()) && path;
      });
      [parentPath] = (await Promise.all(resolvedPathWaits)).filter(
        (x) => x,
      ) as Pathy[];
      if (!parentPath) {
        console.warn(
          `Could not find config file ${currentConfig.extends} from ${currentConfigDir}`,
        );
        break;
      }
      ok(
        !chain.find((x) => x.path.equals(parentPath)),
        `Cycle detected at ${parentPath}`,
      );
      const config = await parentPath.read<Config>();
      chain.unshift({ path: parentPath, config });
      currentConfig = config;
      currentConfigDir = parentPath.up();
    }
    return chain;
  }

  /**
   * Reload from disk, clobbering any instance differences.
   */
  async reload() {
    this.data = await this.path.read<Config>();
    return this;
  }

  async save(options?: PathyWriteOptions) {
    await this.path.write(this.data, { trailingNewline: true, ...options });
    return this;
  }

  /**
   * Retrieve a raw config value, if it is set.
   * **NOTE:** This returns the value directly,
   * so mutation of returned objects/arrays will
   * be direct mutations!
   */
  get<K extends keyof Config>(property: K): Config[K] {
    return this.data[property];
  }

  /**
   * Set a config value, immediately saving to disk.
   */
  async set<K extends keyof Config>(property: K, value: Config[K]) {
    this.data[property] = value;
    await this.save();
  }

  /**
   * Get a deep clone of the raw config data.
   * (Automatically used by `JSON.stringify()`)
   */
  toJSON() {
    return clone(this.data);
  }
}
