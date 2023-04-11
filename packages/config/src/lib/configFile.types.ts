import type { Pathy } from '@bscotch/pathy';

export interface ConfigFileOptions<Config> {
  /**
   * The full path to the file.
   */
  path?: string | Pathy;

  /**
   * The directory containing the config file.
   */
  dir?: string | Pathy;

  /**
   * The basename for this specific instance. Inferred from
   * `path` or `defaultBasename` if not provided.
   *
   * This allows for using non-standard names for config files.
   *
   * @default defaultBasename || basename(path)
   */
  basename?: string;

  /**
   * The default basename for this sort of config file.
   * Inferred from `path` or `basename` if not provided.
   *
   * Any config instances that provide a full `path` will
   * use whatever basename provided via that path. The
   * `defaultBasename` is used when only a `dir` is provided.
   *
   * @example
   * 'package.json'
   * 'tsconfig.json'
   */
  defaultBasename?: string;

  /**
   * The data expected to be in the config file.
   * If not provided, the ConfigFile instance will attempt
   * to synchronously load the file from disk.
   */
  data?: Config;
}
