import type { Constructor } from 'type-fest';
import type { Decorator } from './decorator.js';
import { createDecorator } from './decorator.js';
import {
  clearMemoized,
  memoizedValue,
  type MemoizedClass,
} from './memoize.lib.js';
export type { MemoizedClass } from './memoize.lib.js';

/**
 * A simple decorator for adding caching to a class method
 * or accessor using the default memoization key
 * (JSON stringification of the arguments).
 */
export const memoize = Memoize();

export const memoizeUnresolved = MaxAge(0, 10);

export function MaxAge(seconds: number, staleWhileRerunSeconds = seconds / 10) {
  return Memoize({
    ttl: { maxAge: seconds, staleWhileRevalidate: staleWhileRerunSeconds },
  });
}

/**
 * A decorator for caching the result of a method call, including
 * getter methods.
 */
export function Memoize(options?: {
  /**
   * An optional key-generating function can be
   * provided to generate
   * different keys based on the arguments provided in the function
   * call, allowing caching of multiple
   * outputs. Defaults to JSON-stringifying the arguments array.
   * @default JSON.stringify
   */
  keyGen?: (args: any[]) => string;
  ttl?: {
    /**
     * If the cache is older than this (in seconds),
     * the fresh value will be generated, cached, and
     * returned.
     */
    maxAge: number;
    /**
     * If the cache is older than `maxAge` but
     * less than `maxAge + staleWhileRevalidate`,
     * return the cached value while re-running
     * the function to update the cache for the
     * next request.
     */
    staleWhileRevalidate?: number;
  };
}): Decorator {
  return createDecorator('cache', (context) => {
    if (context.type === 'class') {
      // Add the per-instance all-cache clear method
      const name: keyof MemoizedClass = 'clearMemoized';
      context.classConstructor.prototype[name] = function (
        scope: string | Constructor<any>,
      ) {
        return clearMemoized.apply(this, [context, scope]);
      };
    } else if (['accessor', 'method'].includes(context.type)) {
      const methodName = context.type === 'accessor' ? 'get' : 'value';
      const valueGenerator = context.descriptor?.[methodName];
      if (typeof valueGenerator !== 'function') {
        return;
      }
      context.descriptor![methodName] = function (...args: any[]) {
        return memoizedValue(
          this,
          { ...context, arguments: args },
          valueGenerator,
          options?.keyGen || JSON.stringify,
          options?.ttl,
        );
      };
    }
  });
}
