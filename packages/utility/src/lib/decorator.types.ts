import type { AsyncReturnType, Constructor } from 'type-fest';

/**
 * Supported decorator types.
 */
export type DecoratorType = 'class' | 'method' | 'accessor';

/**
 * Any method.
 */
export type Method = (...args: any[]) => any;

export type Decorator<T = any, V = any> = (
  target: T,
  propertyKey?: string,
  descriptor?: TypedPropertyDescriptor<V>,
) => any;

/**
 * Information available to decorators about decorated targets.
 */
export interface DecoratedBase<V = any> {
  /**
   * The "target" is the conventional name for
   * the first argument passed to any decorator.
   * For classes and static properties this is the class constructor.
   * For instance properties this is the instance prototype.
   *
   * It is *always* present.
   */
  target: any;

  /**
   * The "propertyKey" is the conventional name for the second argument
   * passed to any decorator. It is the name of the method, accessor,
   * property, or parameter being decorated.
   *
   * It is present for all decorator types except Class Decorators.
   */
  propertyKey?: string;

  /**
   * The "descriptor" is the conventional name for the third argument,
   * referring to the property descriptor object of
   * `target[propertyKey]`.
   *
   * Available for method and accessor decorators.
   *
   * See {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty#description}
   */
  descriptor?: TypedPropertyDescriptor<V>;
}

/**
 * Classic information available to decorators about decorated targets,
 * plus helper information provided by utilities.
 */
export interface Decorated extends DecoratedBase {
  type: DecoratorType;

  className: string;

  classConstructor: Constructor<any>;

  /**
   * The decorated target's PropertyDescriptor `value` field
   * (the function or value being decorated).
   */
  value?: any;

  /**
   * If `true`, and the decorator is applied to a method,
   * the method is async. If `false` the method may still return
   * a Promise, but it is not an async method.
   */
  isAsync?: boolean;

  /**
   * If `true`, this decorator is applied to a static property.
   */
  isStatic?: boolean;
}

/**
 * Decorated target information for method execution contexts,
 * available as to pre-execution hooks.
 */
export interface DecoratedExecutionContext<
  Store = undefined,
  F extends Method = Method,
> extends Decorated {
  /**
   * The original arguments passed to the function,
   * prior to the decorator doing anything.
   */
  arguments: Parameters<F>;
  store: Store;
}

/**
 * Decorated target information for method execution contexts,
 * available to post-execution hooks.
 */
export interface DecoratedExecutedContext<
  Store = undefined,
  F extends Method = Method,
> extends DecoratedExecutionContext<Store, F> {
  returned: ReturnType<F>;
}

/**
 * Decorated target information for method execution contexts,
 * available to post-executed-value-resolved hooks.
 */
export interface DecoratedResolvedContext<
  Store = undefined,
  F extends Method = Method,
> extends DecoratedExecutionContext<Store, F> {
  returned: AsyncReturnType<F>;
}

/**
 * Components of a function decorator, for use by {@link createFunctionDecorator}.
 *
 * @template M The function being decorated
 */
export interface DecoratorOptions<
  Store = undefined,
  M extends Method = Method,
> {
  /**
   * For method decorators, optionally use lifecycle hooks
   * to more easily add functionality.
   */
  methodHooks?: {
    /**
     * This function will be called prior to the original function.
     * It provides the arguments array that will be passed to the
     * original function, so mutating that array allows for changing
     * the passed arguments.
     *
     * If the function returns a value, that value **will be directly
     * returned** instead of calling the original function. This can
     * be used for memoization, for example. In that case, the other
     * lifecycle hooks will still be called.
     *
     * Only available for method decorators.
     */
    before?: (
      context: DecoratedExecutionContext<Store, M>,
    ) => void | Parameters<M>;

    /**
     * This function will be called upon the original function's return.
     *
     * If any non-`undefined` value is returned, that will be used as
     * the return-type of the original function.
     *
     * Only available for method decorators.
     */
    after?: (
      context: DecoratedExecutedContext<Store, M>,
    ) => void | ReturnType<Method>;

    /**
     * Like {@link after}, this function is called after the original
     * function returns. However, if the returned value is a PromiseLike,
     * this function will be called upon the promise's resolution with
     * the resolved value.
     *
     * Its returned value **does not** override the original return value,
     * since the *unresolved* value (if the returned value was a
     * PromiseLike) will have already been returned.
     *
     * This is useful for logging and other non-mutating operations,
     * allowing you to not have to differentiate between handling sync
     * and async functions.
     *
     * Only available for method decorators.
     */
    afterResolved?: (context: DecoratedResolvedContext<Store, M>) => void;
  };
}
