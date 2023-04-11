import type { UnionToTuple } from '../types/utility/unionToTuple.js';

type NumberIfNumeric<T> = T extends `${infer U extends number}` ? U : T;
type OrDashIfWideNumber<T> = number extends NumberIfNumeric<T>
  ? number | '-'
  : NumberIfNumeric<T>;
type NumberIfDash<T, Cast = true> = T extends '-'
  ? number
  : Cast extends true
  ? NumberIfNumeric<T>
  : T;

/**
 * Given an array of JSON Pointer components,
 * get the string representation of that pointer. Uses the
 * narrowest types possible. Inverse of {@link JsonPointerParse}
 *
 * Follows {@link https://www.rfc-editor.org/rfc/rfc6901 RFC6901},
 * without more advanced features like escaping.
 *
 * @example
 * const pointer0: JsonPointerStringify<["hello","world",10]>
 *                 = "/hello/world/10"
 * const pointer1: JsonPointerStringify<["hello",number]>[]
 *                 = ["/hello/10","/hello/-"]
 * const pointer2: JsonPointerStringify<["hello","world",""]>
 *                 = "/hello/world/"
 * const pointer3: JsonPointerStringify<[""]>
 *                 = "/"
 * const pointer4: JsonPointerStringify<[]>
 *                 = ""
 * const pointer5: JsonPointerStringify<[string,number]>[] = [`/a-string/10`,'/another-string/5','/again/-']
 * // A wide type just returns `string`
 * const pointer6: JsonPointerStringify<(string|number)[]>[] = [`/10/10`,'/4/5/a/b/-','/-/-/-/anything-goes']
 */
export type JsonPointerStringify<P> = P extends []
  ? ''
  : (string | number)[] extends P
  ? string
  : P extends [infer T]
  ? T extends number | string
    ? `/${OrDashIfWideNumber<T>}`
    : never
  : P extends [infer T, ...infer Rest]
  ? T extends number | string
    ? `/${OrDashIfWideNumber<T>}${JsonPointerStringify<Rest>}`
    : never
  : never;

/**
 * Given a JSON Pointer string,
 * get the array/tuple representation of that pointer. Uses the
 * narrowest types possible.
 * Inverse of {@link JsonPointerStringify}
 *
 * Follows {@link https://www.rfc-editor.org/rfc/rfc6901 RFC6901},
 * without more advanced features like escaping.
 */
export type JsonPointerParse<P extends string> = string extends P
  ? string[]
  : P extends ''
  ? []
  : P extends `/${infer U}/${infer Rest}`
  ? [NumberIfDash<U>, ...JsonPointerParse<`/${Rest}`>]
  : P extends `/${infer U}`
  ? [NumberIfDash<U>]
  : never;

type Primitive = string | number | bigint | boolean | undefined | symbol | null;
/**
 * Identify if an array or something like a plain object
 * (excludes functions etc).
 */
// export type ObjectLike<T> = T extends Function | Primitive ? never : T;

/**
 * Given a JSON object/array, get a type representing the
 * valid JSON Pointers for it.
 */
export type JsonPointerArray<T> = unknown extends T
  ? unknown[]
  : readonly [] | _JsonPointerArray<T>;
export type _JsonPointerArray<T> = UnionToTuple<T> extends infer ValueTypes
  ? {
      [ValueIdx in keyof ValueTypes]: ValueIdx extends `${number}`
        ? // Then we're looking at a type at this depth
          ValueTypes[ValueIdx] extends Primitive
          ? []
          : ValueTypes[ValueIdx] extends object
          ? // Then we need to add its keys and, for each key, recurse
            {
              [K in keyof ValueTypes[ValueIdx]]-?: K extends (
                ValueTypes[ValueIdx] extends any[] ? `${number}` : string
              )
                ?
                    | readonly [NumberIfNumeric<K> | K]
                    | readonly [
                        NumberIfNumeric<K> | K,
                        ..._JsonPointerArray<ValueTypes[ValueIdx][K]>,
                      ]
                : number extends K
                ?
                    | readonly [number | '-']
                    | readonly [
                        number | '-',
                        ..._JsonPointerArray<ValueTypes[ValueIdx][K]>,
                      ]
                : never;
            }[keyof ValueTypes[ValueIdx]]
          : never
        : never;
    }[Extract<keyof ValueTypes, `${number}`>]
  : never;

export type JsonPointerString<T> = T extends unknown
  ? string
  : JsonPointerStringify<JsonPointerArray<T>>;

export type JsonPointerStringValue<
  T,
  P extends JsonPointerString<T>,
> = unknown extends T
  ? unknown
  : unknown extends P
  ? unknown
  : JsonPointerParse<P> extends JsonPointerArray<T>
  ? JsonPointerArrayValue<T, JsonPointerParse<P>>
  : never;

export type JsonPointerArrayValue<
  T,
  P extends JsonPointerArray<T>,
> = unknown extends T
  ? unknown
  : T extends Primitive
  ? P extends readonly []
    ? T
    : never
  : P extends readonly []
  ? T
  : P extends readonly [infer U, ...infer Rest]
  ? NumberIfDash<U, false> extends keyof T
    ? Rest extends JsonPointerArray<T[NumberIfDash<U, false>]>
      ? U extends ''
        ? T
        : NumberIfDash<U, false> extends keyof T
        ? JsonPointerArrayValue<T[NumberIfDash<U, false>], Rest>
        : never
      : never
    : never
  : never;
