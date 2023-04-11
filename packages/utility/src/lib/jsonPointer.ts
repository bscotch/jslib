import type {
  JsonPointerArray,
  JsonPointerArrayValue,
  JsonPointerParse,
  JsonPointerString,
  JsonPointerStringValue,
} from './jsonPointer.types.js';
import { assert } from './types.js';

export * from './jsonPointer.types.js';

export interface SetJsonPathValueOptions {
  /**
   * If `true`, only set the value if it is `undefined`
   *
   * @default false
   */
  noClobber?: boolean;
  /**
   * If `true`, will create arrays/objects along the
   * path if they do not exist. If `false`, any missing
   * data structures will result in an error.
   *
   * **⚠️ Caution ⚠️**: If an element is missing and the
   * provided key is numeric (either an integer string or
   * a plain number), an array will be created. For objects
   * using numeric-string keys, this might not be the desired
   * behavior.
   *
   * @default false
   */
  createMissing?: boolean;
}

class Pointable<T, P extends JsonPointerArray<T>> {
  constructor(readonly target: T, readonly pointer: P) {}

  at<Path extends JsonPointerString<T>>(
    path: Path,
  ): JsonPointerParse<Path> extends JsonPointerArray<T>
    ? Pointable<T, JsonPointerParse<Path>>
    : unknown;
  at<Path extends JsonPointerArray<T>>(path: Path): Pointable<T, Path>;
  at(path: (string | number)[] | string): Pointable<T, any> {
    path = ensureParsedJsonPointer(path);
    return new Pointable(this.target, path as any);
  }

  get(): JsonPointerArrayValue<T, P> {
    return getJsonPointerValue<T, P>(this.target, this.pointer as any);
  }

  /**
   * Returns the value that was deleted, or `undefined` if
   * any keys along the pointer could not be resolved.
   */
  delete(): JsonPointerArrayValue<T, P> {
    return deleteJsonPointerValue<T, P>(this.target, this.pointer as any);
  }

  set<
    V extends P extends JsonPointerArray<T>
      ? JsonPointerArrayValue<T, P>
      : never,
  >(
    value: V,
    options?: SetJsonPathValueOptions,
  ): V extends undefined
    ? JsonPointerArrayValue<T, P> | undefined
    : Exclude<JsonPointerArrayValue<T, P>, undefined> {
    return setJsonPointerValue(
      this.target,
      this.pointer as any,
      value,
      options,
    ) as any;
  }
}

export function pointable<T>(value: T): Pointable<T, []> {
  return new Pointable(value, []);
}

/**
 * Given a JSON thingy and a JSON Pointer that belongs to
 * it, attempt to set a value at that pointer location.
 *
 * If successful, the return value will be the value **after**
 * replacement.
 */
export function setJsonPointerValue<
  T,
  P extends JsonPointerString<T>,
  V extends JsonPointerStringValue<T, P>,
>(
  object: T,
  path: P,
  value: V,
  options?: SetJsonPathValueOptions,
): JsonPointerStringValue<T, P>;
export function setJsonPointerValue<
  T,
  P extends JsonPointerArray<T>,
  V extends JsonPointerArrayValue<T, P>,
>(
  object: T,
  path: P,
  value: V,
  options?: SetJsonPathValueOptions,
): JsonPointerArrayValue<T, P>;
export function setJsonPointerValue(
  object: any,
  _path: (number | string)[] | string,
  value: any,
  options?: SetJsonPathValueOptions,
): any {
  const path = ensureParsedJsonPointer(_path);
  assert(
    path.length > 0,
    `Path must be non-empty, otherwise the value cannot be mutated.`,
  );
  assert(
    object,
    `Can only set values when there is at least a root object/array.`,
  );
  let [key] = path;
  const [, nextKey, ...rest] = path;
  // Make sure that the key type makes sense for the object type
  if (Array.isArray(object)) {
    assert(
      typeof key === 'number' || key === '-',
      `Array keys must be numbers or '-'`,
    );
    key = key === '-' ? object.length : key;
  } else {
    assert(
      typeof object === 'object',
      `Pointer came across non-object/array value of type ${typeof object} at key ${key}`,
    );
    key = String(key);
  }

  // If we're already at the end, set the value if possible.
  if (nextKey === undefined) {
    if (options?.noClobber && key in object && object[key] !== undefined) {
      // Then we don't want to clobber, just return what's there.
      return object[key];
    }
    object[key] = value;
    return value;
  }
  // Make sure that the key references an existing entry
  if (key in object) {
    assert(
      object[key] === undefined || typeof object[key] === 'object',
      `The value at key ${key} is not an object or array, and therefore cannot be indexed with key ${nextKey}`,
    );
  }
  if (!(key in object) || object[key] === undefined) {
    assert(options?.createMissing, `Upstream key ${key} does not exist.`);
    object[key] = typeof nextKey === 'number' ? [] : {};
  }
  return setJsonPointerValue(
    object[key],
    [nextKey, ...rest] as any,
    value,
    options,
  );
}

/**
 * Given an input that is either a JSON Pointer string or
 * a parsed JSON Pointer array, return a parsed array.
 *
 * Performs a little validation/casting on inputs,
 * but does not guarantee that the output is a valid pointer.
 */
export function ensureParsedJsonPointer(
  pointer: (number | string)[] | string,
): (number | string)[] {
  assert(
    typeof pointer === 'string' || Array.isArray(pointer),
    'pointer must be a string or array',
  );
  assert(
    typeof pointer !== 'string' || pointer === '' || pointer.startsWith('/'),
    'pointer must start with "/" or be an empty string',
  );
  pointer = typeof pointer === 'string' ? pointer.split('/').slice(1) : pointer;
  return pointer.map((_part) => {
    const part =
      typeof _part === 'string' && _part.match(/^\d+$/) ? Number(_part) : _part;
    assert(
      ['string', 'number'].includes(typeof part),
      `pointer must be an array of strings and numbers: ${_part} is of type ${typeof _part}`,
    );
    return part;
  });
}

/**
 * Given a JSON thingy and a JSON Pointer that belongs to
 * it, return the value at that pointer location.
 *
 * Returns `undefined` if *any* of the keys in the pointer
 * cannot be resolved.
 */
export function getJsonPointerValue<T, P extends JsonPointerString<T>>(
  object: T,
  path: P,
): JsonPointerStringValue<T, P>;
export function getJsonPointerValue<T, P extends JsonPointerArray<T>>(
  object: T,
  path: [...P],
): JsonPointerArrayValue<T, [...P]>;
export function getJsonPointerValue(
  object: any,
  _path: (number | string)[] | string,
): any {
  const path = ensureParsedJsonPointer(_path);
  if (path.length === 0) {
    return object;
  }
  const [key, ...rest] = path;
  // the `in` operator works for fields as strings and numbers,
  // whether the rhs is an array or object
  if (key in object) {
    return getJsonPointerValue(object[key], rest as any);
  }
  return undefined;
}

/**
 * Given a JSON thingy and a JSON Pointer that belongs to
 * it, delete the value at that pointer location.
 *
 * Returns the value that was deleted, or `undefined` if
 * any keys along the pointer could not be resolved.
 */
export function deleteJsonPointerValue<T, P extends JsonPointerString<T>>(
  object: T,
  path: P,
): JsonPointerStringValue<T, P>;
export function deleteJsonPointerValue<T, P extends JsonPointerArray<T>>(
  object: T,
  path: [...P],
): JsonPointerArrayValue<T, [...P]>;
export function deleteJsonPointerValue(
  object: any,
  _path: (number | string)[] | string,
): any {
  const path = ensureParsedJsonPointer(_path);
  assert(path.length, `Cannot delete the root of an object`);
  const [key, ...rest] = path;
  // the `in` operator works for fields as strings and numbers,
  // whether the rhs is an array or object
  if (key in object) {
    if (rest.length === 0) {
      // Then we need to delete this key, if it exists
      const value = object[key];
      if (Array.isArray(object)) {
        if (key === '-') {
          return;
        }
        assert(
          typeof +key === 'number' && !isNaN(+key),
          `Expected ${key} to be a number`,
        );
        object.splice(+key, 1);
      } else {
        delete object[key];
      }
      return value;
    }
    return deleteJsonPointerValue(object[key], rest as any);
  }
  return undefined;
}
