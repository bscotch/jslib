export type ArrayWrapped<T> = T extends any[] ? T : [T];

/**
 * If the provided value is not an array,
 * wrap it in an array. If the value is undefined
 * will return an empty array.
 */
export function arrayWrapped<T>(
  item: T,
): T extends undefined ? never[] : ArrayWrapped<T> {
  if (Array.isArray(item)) {
    // @ts-expect-error Help! Does work, but Typescript doesn't like it.
    return item;
  }
  // @ts-expect-error Help! Does work, but Typescript doesn't like it.
  return typeof item == 'undefined' ? [] : [item];
}

export class PathyError extends Error {
  public tries?: number;

  constructor(message: string, cause?: any, asserter?: Function) {
    super(message);
    this.name = 'PathyError';
    this.cause = cause;
    Error.captureStackTrace(this, asserter || this.constructor);
  }
}

export function assert(
  claim: any,
  message: string,
  cause?: any,
): asserts claim {
  if (!claim) {
    throw new PathyError(message, cause, assert);
  }
}

/**
 * A decorator for async methods that ensures that calls to
 * the method are resolved in order, and that only one call
 * is active at a time.
 */
export function Sequential() {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    let promise: Promise<any> = Promise.resolve();

    descriptor.value = function (...args: any[]) {
      const result = promise.then(() => {
        promise = originalMethod.apply(this, args);
        return promise;
      });
      return result;
    };

    return descriptor;
  };
}

export const sequential = Sequential();
