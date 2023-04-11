import { createDecorator } from './decorator.js';
import { assert } from './types.js';

const sequence = Symbol('sequence');

type AnyFunction = (...args: any[]) => Promise<unknown>;

export type Sequentialized<T extends AnyFunction = AnyFunction> = T & {
  [sequence]: { [subqueueKey: string]: Promise<any> };
};

export interface SequentializeOptions<T extends AnyFunction> {
  shareQueueWith?: Sequentialized;
  /**
   * Optionally provide a function to generate a key,
   * given the arguments passed to the function. If
   * provided, function calls within a queue will be
   * split into independent sub-queues based on the key.
   */
  subqueueBy?: (...args: Parameters<T>) => string;
}

export interface SequentializeDecoratorOptions<T extends AnyFunction> {
  shareQueueWith?: Sequentialized | string;
  /**
   * Optionally provide a function to generate a key,
   * given the arguments passed to the function. If
   * provided, function calls within a queue will be
   * split into independent sub-queues based on the key.
   */
  subqueueBy?: (...args: Parameters<T>) => string;
}

export function isSequentialized(fn: unknown): fn is Sequentialized {
  return typeof fn === 'function' && sequence in fn;
}

export function sequentialize<T extends AnyFunction>(
  fn: T,
  options?: SequentializeOptions<T>,
): Sequentialized<T> {
  const name = `sequentialized(${fn.name || 'anonymous'})`;
  const subqueues = options?.shareQueueWith?.[sequence] || {};
  const sequentialized = {
    // eslint-disable-next-line require-await
    [name]: async function (...args: Parameters<T>): Promise<any> {
      const call = () => fn.apply(this, args);
      // Get the subqueue key
      const subqueueKey = `${options?.subqueueBy?.(...args) ?? ''}`;
      // Only run the sequentialized function after the previous one has completed
      const lastResult = subqueues[subqueueKey];
      subqueues[subqueueKey] = lastResult?.finally().then(call) ?? call();
      const thisResult = subqueues[subqueueKey];
      // When this invocation completes, if it's also the latest one in the queue,
      // then we can replace it with an empty promise to avoid memory leaks
      thisResult.finally(() => {
        if (thisResult === subqueues[subqueueKey]) {
          Reflect.deleteProperty(subqueues, subqueueKey);
        }
      });
      return thisResult;
    },
  }[name] as Sequentialized<T>;
  sequentialized[sequence] = subqueues;
  // Overwrite `.bind()`, since otherwise the function it returns
  // will have lost the `[sequence]` field.
  sequentialized.bind = (thisArg: any) => {
    return sequentialize(fn.bind(thisArg) as T, options);
  };
  return sequentialized;
}

/**
 * Decorator to make a function sequentialized, so that
 * each call will only run after the previous one has completed.
 */
export const sequential = Sequential();

/**
 * Generate a decorator that will sequentialize the decorated async method.
 *
 * @param shareQueueWith - Optionally use a shared queue with another sequentialized function.
 * If a string is provided, it must be the name of a method on the class that is sequentialized
 * before this one (defined earlier).
 */
export function Sequential<T extends AnyFunction>(
  options?: SequentializeDecoratorOptions<T>,
): <T>(
  target: Object,
  propertyKey: string | symbol,
  descriptor: TypedPropertyDescriptor<T>,
) => TypedPropertyDescriptor<T> {
  return createDecorator('sequentializer', (context) => {
    assert(
      context.type === 'method',
      'The @Sequential decorator can only be used on methods',
    );
    assert(
      context.isAsync,
      'The @Sequential decorator can only be used on async methods',
    );
    let queueSource: Sequentialized | undefined = isSequentialized(
      options?.shareQueueWith,
    )
      ? options?.shareQueueWith
      : undefined;
    if (typeof options?.shareQueueWith === 'string') {
      assert(
        options?.shareQueueWith in context.target,
        `Method ${context.propertyKey} cannot share a queue with ${options?.shareQueueWith}; the latter was not found on the target.`,
      );
      queueSource = context.target[options?.shareQueueWith];
    }
    assert(
      !queueSource || isSequentialized(queueSource),
      `Method ${context.propertyKey} cannot share a queue with ${options?.shareQueueWith}; the latter exists but is not sequentialized.`,
    );
    assert(
      context.descriptor && 'value' in context.descriptor,
      `Method ${context.propertyKey} cannot be sequentialized; it does not have a value descriptor.`,
    );
    assert(
      typeof context.descriptor.value === 'function',
      `Method ${context.propertyKey} cannot be sequentialized; its value is not a function.`,
    );
    context.descriptor.value = sequentialize(context.descriptor.value, {
      ...options,
      shareQueueWith: queueSource,
    });
  }) as any;
}
