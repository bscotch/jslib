/**
 * Utilities for decorator functions.
 */

import type {
  Decorated,
  DecoratedExecutedContext,
  DecoratedExecutionContext,
  Decorator,
  DecoratorOptions,
} from './decorator.types.js';
import { assert } from './types.js';

export type {
  Decorated,
  DecoratedExecutedContext,
  DecoratedExecutionContext,
  Decorator,
  DecoratorOptions,
} from './decorator.types.js';

export function createDecorator<Store = undefined>(
  /**
   * The name of the decorator. This is used to provide a
   * function name to the decorator (useful for debugging
   * and logging).
   */
  name: string,
  /**
   * This function is called only once, when the decorator is
   * first evaluated at run-time. It can be used to set up a store,
   * mutate the
   * target function, log application initialization steps, etc.
   *
   * In the absence of the `before`, `after`, and related
   * lifecycle functions, this is essentially equivalent to
   * how you'd set up a decorator function, just with some
   * useful context already computed for you.
   */
  setup: Store extends undefined
    ? ((context: Decorated) => void) | undefined
    : (context: Decorated) => Store,
  options?: DecoratorOptions<Store>,
): Decorator {
  const decorator = {
    [name]: function (...args: Parameters<Decorator>) {
      const [target, propertyKey, descriptor] = args;
      const value = descriptor?.value;
      const isInstance = Object.hasOwn(target, 'constructor');
      const decoratorType =
        typeof propertyKey === 'undefined'
          ? 'class'
          : typeof value === 'function'
          ? 'method'
          : 'accessor';
      const classConstructor = isInstance ? target.constructor : target;

      const baseContext: Decorated = {
        target,
        propertyKey,
        value,
        isStatic: !isInstance,
        classConstructor,
        className: isInstance ? target.constructor.name : target.name,
        descriptor,
        isAsync:
          decoratorType == 'method' &&
          !!(value.constructor.name === 'AsyncFunction'),
        type: decoratorType,
      };

      const store = setup?.(baseContext) as Store;

      // If any method hooks are used, need to set them up
      const usingLifecycleHooks =
        decoratorType === 'method' &&
        options?.methodHooks &&
        Object.keys(options.methodHooks).length > 0;

      if (!usingLifecycleHooks) {
        return;
      }

      // Replace the original function with a wrapper function
      const hooks = options.methodHooks!;
      descriptor!.value = {
        // using an indexed object to allow dynamic naming
        // (for debugging purposes), calling lifecycle functions
        // as needed.
        [propertyKey!]: function (...args: any[]) {
          const context: DecoratedExecutionContext<Store> = {
            ...baseContext,
            arguments: args,
            store,
          };
          // If we have a value from the `before` hook, use
          // that as the return value and skip the function call!
          const returned = hooks.before?.(context) ?? value.apply(this, args);
          const returnedContext: DecoratedExecutedContext<Store> = {
            ...context,
            returned,
            store,
          };
          const newReturned = hooks.after?.(returnedContext);
          if (hooks.afterResolved) {
            if (isPromiseLike(returned)) {
              void returned.then((resolved) => {
                return hooks.afterResolved!({
                  ...context,
                  returned: resolved,
                });
              });
            } else {
              hooks.afterResolved(returnedContext);
            }
          }
          return typeof newReturned === 'undefined' ? returned : newReturned;
        },
      }[propertyKey!];
    },
  }[name];
  return decorator;
}

function hasFunction<V, F extends string>(
  value: V,
  functionName: F,
): V extends { [N in F]: Function } ? V : false {
  try {
    // @ts-ignore
    const func = value[functionName];
    assert(
      typeof func === 'function',
      `Expected ${functionName} to be a function`,
    );
    // @ts-ignore
    return value;
  } catch {}
  // @ts-ignore
  return false;
}

function isPromiseLike(result: any): result is PromiseLike<any> {
  return hasFunction(result, 'then');
}
