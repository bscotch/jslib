import { default as createDebugger, type Debugger } from 'debug';
import type { Decorator } from './decorator.js';
import { createDecorator } from './decorator.js';

export { type Debugger } from 'debug';

const _traceDecoratorCache: { [key: string]: Decorator } = {};
const _traceCache: { [key: string]: Debugger } = {};

/**
 * The [debug package](https://www.npmjs.com/package/debug)
 * recommends using a common prefix for all debug loggers
 * within a project, ideally matching the name of the package
 * so that it has predictable behavior by users.
 *
 * @example
 * const myNamespace: DebugNamespace = '@bscotch/my-package';
 * // turn on logging for your entire package:
 * process.env.DEBUG = `${myNamespace}:*`;
 */
export type TraceNamespace = string;

export interface TracedClass {
  trace: (...args: Parameters<Debugger>) => void;
}

/**
 * Get a [debug](https://www.npmjs.com/package/debug) logging
 * function for a given namespace.
 *
 * @example
 * // For scope `DEBUG=@bscotch/my-package`
 * const trace = useTracer('@bscotch/my-package');
 * trace("Ooooh, a mesage!");
 *
 * // For scope `DEBUG=@bscotch/my-package:*`
 * const subTrace = debug.extend("more-specific");
 * subTrace("A more specific message!");
 */
export function useTracer(namespace: TraceNamespace): Debugger {
  const debug = _traceCache[namespace] || createDebugger(namespace);
  _traceCache[namespace] = debug;
  return debug;
}

/**
 * Get a "debug decorator" function for a given namespace. This
 * decorator uses the `debug` package to log method arguments
 * and return values.
 */
export function Trace(namespace: TraceNamespace): Decorator {
  _traceDecoratorCache[namespace] ||= createDecorator(
    'trace',
    (context) => {
      // If this is the class decorator, add a `trace` method
      if (context.type === 'class') {
        context.classConstructor.prototype.trace = function trace(
          ...args: Parameters<Debugger>
        ) {
          useTracer(`${namespace}:${context.className}:inline`)(...args);
        };
      } else if (context.type === 'accessor') {
        const getter = context.descriptor!.get;
        if (getter) {
          context.descriptor!.get = function traceGetter(this: any) {
            const result = getter.call(this);
            useTracer(
              `${namespace}:${context.className}:${context.propertyKey}`,
            )('getter result', simplify(result));
            return result;
          };
        }
      }

      return {
        debug: useTracer(
          `${namespace}:${context.className}:${context.propertyKey}`,
        ),
      };
    },
    {
      methodHooks: {
        before(context) {
          context.store.debug('called with: %o', simplify(context.arguments));
        },
        afterResolved(context) {
          context.store.debug('returned: %o', simplify(context.returned));
        },
      },
    },
  );
  return _traceDecoratorCache[namespace];
}

function simplify(data: any) {
  const isArray = Array.isArray(data);
  const asArray = isArray ? data : [data];
  const simplified: any[] = [];
  for (const item of asArray) {
    const hasToJsonFunction = typeof item?.toJSON === 'function';
    simplified.push(hasToJsonFunction ? item.toJSON() : item);
  }
  return isArray ? simplified : simplified[0];
}
