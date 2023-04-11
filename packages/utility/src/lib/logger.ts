import { literal } from './array.js';
import { createEventEmitter } from './emitter.js';

export type DefaultFormat = [message: string, ...content: any[]];

export type Level = typeof Logger['levels'][number];

export interface LoggerOptions<Format extends any[]> {
  /**
   * If `true`, the logger will not emit events to
   * listeners.
   *
   * If a function is provided, it will be evaluated
   * prior to each possible log.
   */
  noEmit?: boolean | (() => boolean);

  /**
   * If `true`, the logger will not write to stdout
   * and will only emit log events to listeners.
   *
   * If a function is provided, it will be evaluated
   * prior to each possible log.
   */
  noConsole?: boolean | (() => boolean);

  /**
   * If provided, the returned value will be logged
   * to the console instead of the raw arguments.
   *
   * This is useful for colorized or sanitized output,
   * for example.
   */
  formatter?: (level: Level, ...args: Format) => any;

  /**
   * The minimum level a log message must be to be
   * emitted or logged to the console.
   *
   * If a function is provided, it will be called
   * each time a logger method is called to determine
   * the minimum level.
   *
   * @default "info"
   */
  minLevel?: Level | (() => Level);
}

function returnValueIfFunction<V>(
  value: V,
): V extends (...args: any[]) => infer R ? R : V {
  return typeof value === 'function' ? value() : value;
}

function defaultMinLevel() {
  try {
    return process.env.DEBUG == 'true'
      ? 'debug'
      : (process.env.LOG_LEVEL as Level) || 'info';
  } catch {
    return 'info';
  }
}

/**
 * Create a logger that can emit logs for capture
 * by listeners as well as write to the console.
 */
export class Logger<Format extends any[] = DefaultFormat> {
  static get levels() {
    return literal(['debug', 'info', 'warn', 'error']);
  }

  protected readonly emitter =
    createEventEmitter<[{ name: Level; payload: Format }]>();

  constructor(protected options?: LoggerOptions<Format>) {
    this.options = { ...options };
  }

  log(level: Level, ...args: Format) {
    const minLevel =
      returnValueIfFunction(this.options?.minLevel) || defaultMinLevel();
    if (Logger.levels.indexOf(level) < Logger.levels.indexOf(minLevel)) {
      return;
    }

    if (!returnValueIfFunction(this.options?.noEmit)) {
      this.emitter.emit(level, ...(args as any));
    }
    if (returnValueIfFunction(this.options?.noConsole)) {
      return;
    }
    if (this.options?.formatter) {
      console[level](this.options.formatter(level, ...args));
    } else {
      console[level](...args);
    }
  }

  debug(...args: Format) {
    return this.log('debug', ...args);
  }

  info(...args: Format) {
    return this.log('info', ...args);
  }

  warn(...args: Format) {
    return this.log('warn', ...args);
  }

  error(...args: Format) {
    return this.log('error', ...args);
  }
}
