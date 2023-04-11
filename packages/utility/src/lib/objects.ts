import type { Merge } from 'type-fest';
import type { Inverted } from '../types/utility.js';
import type { PlainObject, Primitive } from '../types/utility/primitives.js';
import { arrayIsDuplicates } from './array.js';
import { assert } from './types.js';

export type AsyncMethodKey<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => Promise<any> ? K : never;
}[keyof T];

export type KeySortRef<T> = T extends Primitive
  ? unknown
  : T extends Array<infer U>
  ? Array<KeySortRef<U>>
  : T extends PlainObject<T>
  ? {
      [K in keyof T]?: unknown;
    }
  : never;

export type ToJson<T> = T extends { toJSON(): infer U }
  ? ToJson<U>
  : T extends Record<any, any>
  ? { [K in keyof T]: ToJson<T[K]> }
  : T;

export function toJson<T>(value: T): ToJson<T> {
  if (typeof value !== 'object' || value === null) {
    return value as any;
  }
  if ('toJSON' in value && typeof value.toJSON === 'function') {
    return value.toJSON();
  }
  value = (value?.valueOf() ?? value) as any;
  if (Array.isArray(value)) {
    return value.map(toJson) as any;
  } else {
    return Object.entries(value as any).reduce((acc, [key, value]) => {
      acc[key] = toJson(value);
      return acc;
    }, {} as any);
  }
}

/**
 * Given an arbitrarily complex data structure,
 * return a *new* data structure (deep-ish copy)
 * where all object
 * keys are sorted the same way as in an example
 * data structure of the same type.
 *
 * @remarks
 * - Non-enumerable keys will be lost in the returned object.
 * - Compares pointer-by-pointer.
 * - Fields not found in the example are left in their
 *   original order, appended to the end.
 * - Fields not found in the data (but found in
 *   the reference) are ignored.
 * - Values in arrays are compared by index. Index
 *   positions found in the data where (a) no
 *   corresponding index exists in the reference,
 *   or (b) the reference value is not an object,
 *   will use the first available object in the
 *   reference when working backwards.
 */
export function sortKeysByReference<
  T extends Record<string | symbol, any>,
  R extends KeySortRef<T>,
>(data: Readonly<T>, reference: Readonly<R>): T;
export function sortKeysByReference<T extends Record<string | symbol, any>>(
  data: Readonly<T>,
  reference: any,
): T;
export function sortKeysByReference<T extends [...any[]], R extends T>(
  data: Readonly<T>,
  reference: R,
): T;
export function sortKeysByReference<T extends Primitive>(
  data: T,
  reference: any,
): T;
export function sortKeysByReference<T, Ref extends T>(
  data: Readonly<T>,
  reference: Readonly<Ref>,
): T {
  if (!isPlainObjectOrArray(data)) {
    return data;
  }
  if (!isPlainObjectOrArray(reference)) {
    return data;
  }
  // Make sure that they're either both arrays or both
  // plain objects.
  if (!arrayIsDuplicates([Array.isArray(data), Array.isArray(reference)])) {
    // Then we have non-comparable types
    return data;
  }
  // Finally we should be able to attempt to sort
  if (isPlainObject(data)) {
    const unsortedKeys = Object.keys(data) as (keyof T)[];
    const sampleKeys = Object.keys(reference) as (keyof T)[];
    const sortedObject: Partial<T> = {};
    // Add all of the entries by example key-order
    for (const key of sampleKeys) {
      if (key in data) {
        // `in` allows for keys that exist but have undefined values
        sortedObject[key] = sortKeysByReference(
          data[key] as any,
          reference[key],
        );
      }
    }
    // Add all leftoever entries in their original (relative) order
    for (const key of unsortedKeys) {
      if (!(key in sortedObject)) {
        sortedObject[key] = sortKeysByReference(
          data[key] as any,
          reference[key],
        );
      }
    }
    data = sortedObject as T;
  } else if (Array.isArray(data)) {
    let i = 0;
    const sampleArray = reference as unknown as any[];
    const sortedObjectArray: any[] = [];
    // Use the matching position in the example array
    // until no examples remain, then use the last example
    // for any remaining data entries.
    let lastSeenReferenceObject: unknown;
    for (; i < sampleArray.length && i < data.length; i++) {
      lastSeenReferenceObject = isPlainObject(sampleArray[i])
        ? sampleArray[i]
        : lastSeenReferenceObject;
      sortedObjectArray.push(
        sortKeysByReference(data[i], lastSeenReferenceObject),
      );
    }
    for (; i < data.length; i++) {
      sortedObjectArray.push(
        sortKeysByReference(data[i], lastSeenReferenceObject),
      );
    }
    data = sortedObjectArray as unknown as T;
  }
  return data;
}

export function isPlainObject<T>(
  something: T,
): PlainObject<T> extends T ? true : false {
  return (
    something &&
    typeof something == 'object' &&
    !Array.isArray(something) &&
    ((!something.toString ||
      something.toString?.() == '[object Object]') as any)
  );
}

export function isPlainObjectOrArray(
  something: any,
): something is Record<string, any> | Array<any> {
  return Array.isArray(something) || isPlainObject(something);
}

/**
 * Convert an array into objects that use numeric
 * strings as indices. Non-array items are returned as-is.
 */
export function arrayToObject(array: any[]) {
  if (!Array.isArray(array)) {
    return array;
  }
  return array.reduce((asMap, value, index) => {
    asMap[`${index}`] = value;
    return asMap;
  }, {} as { [key: string]: any });
}

/**
 * Flatten a nested data structure into a one-level-deep
 * map, with keys as paths like "firstLevel.secondLevel.0.3".
 * It's assumed that object keys are not castable as numbers,
 * so that all numeric parts of the path are unambiguously from
 * arrays.
 */
export function flattenObjectPaths(object: any) {
  if (!isPlainObjectOrArray(object)) {
    return object;
  }
  // Make a shallow clone.
  object = Array.isArray(object) ? [...object] : { ...object };
  const toReturn: { [key: string]: any } = {};
  for (const key of Object.keys(object)) {
    assert(!key.includes('.'), 'Keys must not have periods in them.');
    object[key] = arrayToObject(object[key]);
    // Convert arrays to objects
    if (isPlainObject(object[key])) {
      const flatObject = flattenObjectPaths(object[key]);
      for (const subkey of Object.keys(flatObject)) {
        toReturn[`${key}.${subkey}`] = flatObject[subkey];
      }
    } else {
      toReturn[key] = object[key];
    }
  }
  return toReturn;
}

export function objectPaths(object: any) {
  const flattened = flattenObjectPaths(object);
  if (!isPlainObject(flattened)) {
    return [];
  }
  return Object.keys(flattened);
}

/** Get the value at a fully defined (no wildcards) path. */
export function getValueAtPath(object: any, path: string) {
  const pathParts = path.split('.');
  let subObject = object;
  for (const part of pathParts) {
    subObject = subObject?.[part];
    if (!subObject) {
      return;
    }
  }
  return subObject;
}

/**
 * Set the value at a fully defined (no wildcards) path.
 * Any missing data structures will be added.
 */
export function setValueAtPath(
  object: any,
  path: string,
  value: any,
  options?: {
    /** @default '.' */
    sep?: string;
    noClobber?: boolean;
  },
) {
  const pathParts = path.split(options?.sep || '.').filter((s) => s !== '');
  let subObject = object;
  for (let level = 0; level < pathParts.length - 1; level++) {
    const index = pathParts[level].match(/^\d+$/)
      ? Number(pathParts[level])
      : pathParts[level];
    if (typeof subObject[index] == 'undefined') {
      subObject[index] = typeof index == 'number' ? [] : {};
    }
    subObject = subObject[index];
  }
  const finalKey = pathParts[pathParts.length - 1];
  subObject[finalKey] = options?.noClobber
    ? typeof subObject[finalKey] === 'undefined'
      ? value
      : subObject[finalKey]
    : value;
}

/**
 * Given an object path that *may* include wildcards
 * (e.g. `a.*.b`), get all paths that match. Assumes
 * that path components do not include regex special
 * characters (except '.' and '*');
 */

export function objectPathsFromWildcardPath(path: string, object: any) {
  const allPaths = objectPaths(object);
  const pathAsRegex = new RegExp(
    `^(${path.replace(/\./, '\\.').replace(/\*/g, '[^.]+')})(\\.|$)`,
  );
  const matches = allPaths
    .map((path) => path.match(pathAsRegex)?.[1])
    .filter((x) => x);
  return [...new Set(matches)] as string[]; // ensure unique
}

/**
 * Apply a function to a value inside an object,
 * using a path string for complex data structures.
 * Allows using `*` to mean *all* fields.
 * For example, `a.b.3.*`, for structure
 * `{a:{b:[0,1,{c:'hello',d:'world'}]}}`
 * would capture paths `a.b.3.c` and `a.b.3.d`
 * and apply the transform to both values.
 * If a path does not exist, no action is taken.
 */
export function transformValueByPath(
  object: { [key: string]: any } | any[],
  path: string,
  transformer: (value: any) => any,
) {
  if (!isPlainObjectOrArray(object)) {
    return object;
  }
  const paths = objectPathsFromWildcardPath(path, object);
  for (const subpath of paths) {
    const value = getValueAtPath(object, subpath);
    setValueAtPath(object, subpath, transformer(value));
  }
  return object;
}

/**
 * Get an object's keys. Simply uses `Object.keys`,
 * but with type support.
 */
export function keysOf<T extends Record<string, any>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

/**
 * Delete any keys whose values are `undefined`. Mutates and returns the provided object.
 */
export function deleteUndefinedValues<T extends Record<string, any>>(
  obj: T,
): T {
  for (const key of keysOf(obj)) {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  }
  return obj;
}

/**
 * Same as {@link deleteUndefinedValues},
 * but acting on a copy of the provided
 * object instead of mutating in place.
 */
export function omitUndefinedValues<T extends Record<string, any>>(obj: T): T {
  return deleteUndefinedValues({ ...obj });
}

/**
 * Merge two objects. Values in
 * the second object will overwrite values
 * in the first, *except for `undefined`*
 * (note that built-in `Object.assign` does
 * clobber with `undefined` values).
 *
 * Arrays clobber by default, but can
 * optionally be set to merge.
 *
 * Returns a new object. Does not mutate
 * the provided objects.
 */
export function merge<
  T extends Record<string, any>,
  U extends Record<string, any>,
>(
  o1: T,
  o2: U,
  options?: { concatArrays?: boolean; unique?: boolean | string },
): Merge<T, U> {
  const merged: { [K in keyof T | keyof U]: any } = { ...o1 } as any;
  for (const key of keysOf(o2)) {
    if (o2[key] === undefined) {
      continue;
    }
    // Otherwise manage clobbering/combining
    // based on options.
    if (Array.isArray(merged[key as any]) && Array.isArray(o2[key])) {
      // If concatting, combine them together
      if (options?.concatArrays) {
        merged[key] = [...merged[key], ...o2[key]] as any;
        if (options?.unique) {
          const alreadySeen = new Set();
          for (let i = merged[key].length; i > -1; i--) {
            if (typeof options.unique === 'string') {
              const value = merged[key][i][options.unique];
              if (value !== undefined && alreadySeen.has(value)) {
                merged[key].splice(i, 1);
              }
              alreadySeen.add(value);
            } else if (alreadySeen.has(merged[key][i])) {
              merged[key].splice(i, 1);
            } else {
              alreadySeen.add(merged[key][i]);
            }
          }
        }
      }
      // Otherwise, clobber
      else {
        merged[key] = o2[key] as any;
      }
      continue;
    } else if (typeof o2[key] === 'object' && typeof merged[key] === 'object') {
      merged[key] = merge(merged[key], o2[key], options) as any;
      continue;
    }
    // Fallback to clobbering
    merged[key] = o2[key] as any;
  }
  return merged;
}

/**
 * Return a new object whose keys and values
 * are swapped.
 */
export function invert<T extends Record<PropertyKey, PropertyKey>>(
  obj: T,
): Inverted<T> {
  const keys = keysOf(obj);
  const inverted = {} as Record<any, any>;
  for (const key of keys) {
    const value = obj[key];
    if (['string', 'number', 'symbol'].includes(typeof value)) {
      inverted[obj[key]] = key;
    }
  }
  return inverted as Inverted<T>;
}

/**
 * Return a new object with a subset of fields.
 */

export function pick<T extends object, K extends keyof T>(
  obj: T,
  select: K[],
): Pick<T, K> {
  const result = {} as any;
  for (const key of select) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Return a new object with a blocklisted
 * set of fields.
 */
export function omit<T extends {}, K extends keyof T>(
  obj: T,
  select: K[],
): Omit<T, K> {
  const result: any = {};
  for (const prop of keysOf(obj)) {
    if (!select.includes(prop as any)) {
      result[prop] = obj[prop];
    }
  }
  return result;
}

/**
 * Return a list of all non-#private methods
 * on an object, following the prototype chain.
 */
export function listPublicAsyncMethods<T>(obj: T): AsyncMethodKey<T>[] {
  const methods: AsyncMethodKey<T>[] = [];
  for (
    let proto = obj;
    proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    const descriptors = Object.getOwnPropertyDescriptors(proto);
    for (const key of Object.keys(descriptors)) {
      const isValidAsyncFunction =
        descriptors[key]?.value instanceof Function &&
        descriptors[key].value.constructor.name === 'AsyncFunction' &&
        key !== 'constructor';
      if (!isValidAsyncFunction) {
        continue;
      }
      methods.push(key as any);
    }
  }
  return methods;
}
