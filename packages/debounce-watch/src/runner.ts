/**
 * @file General watcher utility for re-running functions after debounced
 * file-change events
 */

import { assert, explode, isArray } from '@bscotch/utility';
import type { FSWatcher, WatchOptions } from 'chokidar';
import chokidar from 'chokidar';
import type { Stats } from 'fs';
import fs from 'fs';
import path from 'path';

type Logger = {
  [level in 'info' | 'warn' | 'debug' | 'error']: (...args: any[]) => void;
};

function createLogger(customLogger?: Partial<Logger>): Logger {
  return {
    info: console.log,
    warn: console.log,
    error: console.error,
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    debug: process.env.DEBUG == 'true' ? console.log : () => {},
    ...customLogger,
  };
}

const watcherEventNames = [
  'add',
  'change',
  'unlink',
  'addDir',
  'unlinkDir',
] as const;

export type WatcherEventName = typeof watcherEventNames[number];

export interface WatcherEvent {
  event: WatcherEventName;
  relativePath: string;
  absolutePath: string;
  parsedPath: ReturnType<typeof path['parse']>;
  stats: Stats;
}

export type DebouncedEventsProcessor = (
  /** All events that occurred during debouncing. */
  events: WatcherEvent[],
) => any | Promise<any>;

export interface DebounceWatchOptions {
  /**
   * Restrict file-related watching and events to
   * a subset of extensions. If folder-related events
   * are listed in `options.events`, this setting
   * will not prevent those events from occurring.
   *
   * E.g. 'png' or ['png','jpg']
   */
  onlyFileExtensions?: string | string[];

  /**
   * By default, only ['add','change'] events trigger `onChange()`.
   * You can override this with your preferred list of events.
   */
  events?: WatcherEventName[];
  /**
   * Seconds to wait for additional changes before running
   * the target function. Default is subject to change.
   */
  debounceWaitSeconds?: number;
  /**
   * By default, if the last onChange invokation has not completed
   * then further invokations will have to wait until it is complete.
   * If set to `true`, then this will not be enforced.
   */
  allowOverlappingRuns?: boolean;
  /**
   * Custom logging based on severity level.
   * Defaults to console.log/error, with high
   * verbosity when process.env.DEBUG is "true"
   */
  logger?: Logger;
  /**
   * This function uses Chokidar watcher options that are
   * robust and predictable (if resource-costly): polling, no glob patterns, etc.
   * If you want to overwrite the defaults, you should set
   * *all* parameters since the defaults this function uses
   * are not the same as what Chokidar uses.
   */
  chokidarWatchOptions?: WatchOptions;
}

/**
 * Watch for file system events and debounce them. Collect
 * events during debouncing, and once events have stopped
 * call a target function while providing the list of events.
 */
export function debounceWatch(
  /**
   * Function to call after debounced change events.
   * Currently no arguments are passed to the function,
   * but that could change.
   */
  eventProcessor: DebouncedEventsProcessor,
  watchFolder: string,
  options?: DebounceWatchOptions,
): Promise<FSWatcher> {
  const logger = createLogger(options?.logger);
  logger.info(`Running in watch mode at "${process.cwd()}"`);
  logger.debug(`Watching folder "${watchFolder}"`);

  assert(watchFolder, `Watch folder is required.`);

  // Set up the watcher
  const extensions = isArray(options?.onlyFileExtensions)
    ? options!.onlyFileExtensions!
    : explode(options?.onlyFileExtensions);
  const debounceWaitMillis = (options?.debounceWaitSeconds || 1) * 1000;
  let debounceTimeout: NodeJS.Timeout | null = null;
  const pollInterval = Math.round(debounceWaitMillis / 3);
  const watcher = chokidar.watch(watchFolder, {
    // polling seems to be a lot more reliable (if also a lot less efficient)
    usePolling: true,
    interval: pollInterval,
    binaryInterval: pollInterval,
    disableGlobbing: true,
    ignored: (path) => {
      const stat = fs.existsSync(path) && fs.statSync(path);
      if (stat) {
        if (stat.isDirectory()) {
          return false;
        }
        const matchesExtension =
          !extensions[0] ||
          extensions.some((ext) => path.endsWith(`.${ext.replace(/^\./, '')}`));
        return !matchesExtension;
      }
      // Chokidar first calls with `path` only.
      // When this function returns `false` in that case,
      // Chokidar runs again with both arguments.
      return false;
    },
    awaitWriteFinish: {
      stabilityThreshold: Math.round(pollInterval / 2),
      pollInterval: Math.round(pollInterval / 4),
    },
    ...options?.chokidarWatchOptions,
  });

  // Collect events while waiting for debouncing to stop,
  // then call the supplied onChange with the accumulated events.
  let events: WatcherEvent[] = [];

  let running = false;
  const debouncedRun = (event: WatcherEvent) => {
    logger.debug('Change detected, debouncing');
    events.push(event);
    clearTimeout(debounceTimeout!);
    debounceTimeout = setTimeout(async () => {
      // Prevent overlapping runs
      if (running && !options?.allowOverlappingRuns) {
        logger.debug('Attempted to run while already running.');
        return;
      }
      logger.debug('Watcher detected changes');
      running = true;
      const eventsCopy = [...events];
      events = []; // reset to start collecting next debounced batch
      await eventProcessor(eventsCopy);
      running = false;
    }, debounceWaitMillis);
  };

  // Set up the watcher
  watcher.on('error', async (err: Error & { code?: string }) => {
    logger.error('Closing watcher due to error...', err);
    await watcher.close();
    process.exit(1);
  });
  (options?.events || (['add', 'change'] as WatcherEventName[])).forEach(
    (event) => {
      watcher.on(event, (filePath, stats: Stats) => {
        logger.debug(`Detected event ${event} on path ${filePath}`);
        debouncedRun({
          event,
          relativePath: filePath,
          absolutePath: path.resolve(watchFolder, filePath),
          parsedPath: path.parse(path.resolve(watchFolder, filePath)),
          stats,
        });
      });
    },
  );
  // Don't need to call the function right out of the gate,
  // because the watcher triggers 'add' events when it loads.
  return new Promise((resolve) => {
    watcher.on('ready', () => resolve(watcher));
  });
}

/**
 * @alias debounceWatch
 * @deprecated
 */
export const runAfterDebouncedFileSystemEvents = debounceWatch;
