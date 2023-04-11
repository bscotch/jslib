import type { Constructor } from 'type-fest';
import type { Decorated, DecoratedExecutionContext } from './decorator.js';
import { useTracer } from './trace.js';

const trace = useTracer('@bscotch:Memoize');

/**
 * To inform Typescript about features added to your
 * class through using a `Memoize()` decorator on your
 * class, extend its definition using this interface.
 *
 * For example:
 *
 * ```ts
 * interface MyClass extends MemoizedClass {}
 *
 * @Memoize()
 * class MyClass {
 *   someMethod(){
 *     this.clearMemoized();
 *   }
 * }
 * ```
 */
export interface MemoizedClass {
  /**
   * Clear the memoized values within some scope.
   *
   * Scopes:
   * - **Property**: if the `scope` value is a string
   * - **Instance**: if the `scope` value is undefined, all cached values on the instance will be cleared.
   * - **Class**: if the `scope` value is a class constructor,
   * all cached values on *all instances* of the class will
   * be cleared.
   *
   * @example
   * class
   */
  clearMemoized: (scope?: string | Constructor<any>) => void;
}

function isExpired(value: CacheValue) {
  return value.expiresAt && value.expiresAt <= new Date();
}

function canUseStaleWhileRevalidate(value: CacheValue) {
  return (
    value.staleWhileRevalidateUntil &&
    value.staleWhileRevalidateUntil >= new Date()
  );
}

function cacheHas<K, T extends Map<K, CacheValue>>(cache: T, key: K) {
  if (cache.has(key)) {
    // See if it has expired
    const value = cache.get(key)!;
    if (isExpired(value) && !canUseStaleWhileRevalidate(value)) {
      // Expired
      cache.delete(key);
    } else {
      return true;
    }
  }
  return false;
}

/**
 * Get a memoized value if it already exists, otherwise
 * call the value-generating function to create and store
 * it, and return that value.
 */
export function memoizedValue<V extends CacheValue>(
  calledBy: any,
  decorated: Decorated | DecoratedExecutionContext,
  valueGenerator: (...args: any[]) => V,
  keyGenerator?: (args: any[]) => CacheKey,
  ttl?: {
    maxAge: number;
    staleWhileRevalidate?: number;
  },
): V {
  const args = 'arguments' in decorated ? decorated.arguments : [];
  const cacheKey = keyGenerator?.(args);
  const cache = memoizer.forProperty(
    decorated.classConstructor,
    calledBy,
    decorated.propertyKey,
  );
  let usingStaleValue = false;
  if (cacheHas(cache, cacheKey)) {
    const cached = cache.get(cacheKey)!;
    trace(`used cached for [${decorated.className}]:${decorated.propertyKey}`);
    if (isExpired(cached) && canUseStaleWhileRevalidate(cached)) {
      usingStaleValue = true;
    } else {
      return cached.value;
    }
  }
  trace(`missed cache for [${decorated.className}]:${decorated.propertyKey}`);
  trace(`computing value from args: %o`, args);
  trace(`using property function: %s`, decorated.propertyKey);
  const cached = cache.get(cacheKey);
  // If using stale, only re-run if we aren't already
  // waiting for a re-run to complete.
  if (usingStaleValue && cached?.nextValue) {
    return cached.value;
  }
  const nextValue = valueGenerator.bind(calledBy)(...args);
  if (cached && usingStaleValue && nextValue instanceof Promise) {
    // Then set it to the next value, with a THEN
    // that replaces the value upon resolution.
    cached.nextValue = nextValue;
    nextValue.finally(() => {
      cache.set(cacheKey, toCachedValue(nextValue, ttl));
    });
    return cached.value;
  }
  cache.set(cacheKey, toCachedValue(nextValue, ttl));
  return nextValue as V;
}

function toCachedValue(
  value: any,
  ttl?: {
    maxAge: number;
    staleWhileRevalidate?: number;
  },
): CacheValue {
  const expiresAt = ttl?.maxAge
    ? new Date(Date.now() + ttl!.maxAge * 1000)
    : undefined;
  const staleWhileRevalidateUntil =
    expiresAt && ttl?.staleWhileRevalidate
      ? new Date(expiresAt.getTime() + ttl!.staleWhileRevalidate * 1000)
      : undefined;
  return {
    value,
    expiresAt,
    staleWhileRevalidateUntil,
  };
}

export function clearMemoized(
  this: any,
  context: Decorated,
  scope: string | Constructor<any>,
) {
  const isInstanceScope = scope === undefined;
  const isClassScope = !isInstanceScope && scope === context.classConstructor;
  if (isInstanceScope) {
    clearMemoizedTarget(context.classConstructor, this);
    trace(`purged instance cache [${context.className}]`);
  } else if (isClassScope) {
    clearMemoizedClass(context.classConstructor);
    trace(`purged class cache [${context.className}]`);
  } else if (typeof scope === 'string') {
    // Must be property scope!
    clearMemoizedProperty(context.classConstructor, this, scope);
    trace(`purged property cache [${context.className}]`);
  } else {
    throw new Error(`Invalid purge scope: ${scope}`);
  }
}

/**
 * Store for memoized content, set up hierarchically
 * for automatic memory management and easy
 * clearing/adding/removal of memoized content by class
 * or by target.
 *
 * Keyed by decorator parameters (allowed `undefined`):
 *
 * constructor -> target -> propertyKey -> cacheKey -> value
 *
 * Then keyed by the user-provided key generator function results.
 */
const decoratorStorage: ClassesCache = new Map();

type AnyClass = Constructor<any>;

/**
 * A decorator 'propertyKey' is undefined for class decorators,
 * and a string for everything else.
 */
type PropertyKey = string | undefined;
type CacheKey = string | undefined;
type CacheValue = {
  /** The cached value */
  value: any;

  /**
   * When using TTL caching with stale results
   * while revalidating, this holds onto the
   * promise containing the next cache value
   * (triggered by the first post-expirty call)
   * until it resolves. In the interim, the prior
   * value is returned by the cache.
   */
  nextValue?: Promise<any>;

  /**
   * Timestamp of when the value expires.
   * If undefined, the value never expires.
   */
  expiresAt?: Date;

  /**
   * If this and `expiresOn` are both defined,
   * after `expiresOn` any subsequent cache access
   * will trigger a refresh but still serve the
   * stale value until this date.
   */
  staleWhileRevalidateUntil?: Date;
};
/**
 * The decorator "Target" is always the class constructor
 * or the instance prototype.
 */
type Target = Function;

type TargetPropertyValuesCache = Map<CacheKey, CacheValue>;
type TargetPropertiesCache = Map<PropertyKey, TargetPropertyValuesCache>;
type TargetsCache = WeakMap<Target, TargetPropertiesCache>;
type ClassesCache = Map<AnyClass, TargetsCache>;

const memoizer = {
  forClass(theClass: AnyClass): TargetsCache {
    return ensureChildMap(decoratorStorage, theClass, WeakMap);
  },
  forTarget(theClass: AnyClass, target: any): TargetPropertiesCache {
    return ensureChildMap(memoizer.forClass(theClass), target, Map);
  },
  forProperty(
    theClass: AnyClass,
    target: any,
    propertyKey: PropertyKey,
  ): TargetPropertyValuesCache {
    return ensureChildMap(
      memoizer.forTarget(theClass, target),
      propertyKey,
      Map,
    );
  },
};

export function clearMemoizedValue(
  theClass: AnyClass,
  target: Target,
  propertyKey: PropertyKey,
  cacheKey: CacheKey,
) {
  memoizer.forProperty(theClass, target, propertyKey).delete(cacheKey);
}

export function clearMemoizedProperty(
  theClass: AnyClass,
  target: Target,
  propertyKey: PropertyKey,
) {
  memoizer.forProperty(theClass, target, propertyKey).clear();
}

/**
 * Clear all stored values for a given target. If the
 * target is an instance, that instance's stores will
 * all be cleared. If that instance is a class, all
 * static stores will be cached.
 *
 * This does *not* clear per-instance caches. For that
 * purpose, use {@link clearMemoizedClass}.
 */
export function clearMemoizedTarget(theClass: AnyClass, target: Target) {
  memoizer.forTarget(theClass, target).clear();
}

/**
 * Clear all storage of any sort for a class and all
 * instances of that class.
 */
export function clearMemoizedClass(theClass: AnyClass) {
  decoratorStorage.delete(theClass);
}

/**
 * Given a parent Map and a child key that itself should
 * key onto a Map, ensure that such a Map exists and
 * return a reference to it.
 */
function ensureChildMap<K, Child extends AnyStrengthMap<any, any>>(
  parentMap: AnyStrengthMap<K, Child>,
  childKey: K,
  mapConstructor: AnyStrengthMapConstructor<Child>,
): Child {
  if (!parentMap.has(childKey)) {
    parentMap.set(childKey, new (mapConstructor as any)());
  }
  return parentMap.get(childKey)!;
}

type AnyStrengthMap<K, V> =
  | Map<K, V>
  | (K extends object ? WeakMap<K, V> : never);

type AnyStrengthMapConstructor<M extends AnyStrengthMap<any, any>> =
  M extends Map<any, any>
    ? MapConstructor
    : M extends WeakMap<any, any>
    ? WeakMapConstructor
    : never;
