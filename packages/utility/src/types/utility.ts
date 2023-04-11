export type { Primitive } from './utility/primitives.js';
export type { Spread } from './utility/spread.js';
import type { Primitive } from './utility/primitives.js';
export type EmptyArray = never[];
export type NonEmptyArray<T = any> = [T, ...T[]];
export type EmptyObject = Record<string, never>;
export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PATCH'
  | 'PUT'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS';

export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

export type PromiseUnwrapped<T> = T extends PromiseLike<infer U>
  ? PromiseUnwrapped<U>
  : T;

export type ExtractArrays<U> = Extract<U, Array<any>>;
export type ExcludeArrays<U> = Exclude<U, Array<any>>;
export type ExtractPrimitives<U> = Extract<U, Primitive>;
export type ExcludePrimitives<U> = Exclude<U, Primitive>;

export type AnyFunction = (...args: any[]) => any;
export type Nullish = null | undefined;
export type Falsey = false | 0 | '' | null | undefined;
export type NotFalsey<T> = Exclude<T, Falsey>;
export type NotNullish<T> = Exclude<T, Nullish>;
export type NotNull<T> = Exclude<T, null>;
export type Defined<T> = Exclude<T, undefined>;
export type ArrayOrSingleton<T> = T | T[];

export type Inverted<T extends Record<PropertyKey, any>> = {
  [P in keyof T as T[P]]: T[P] extends PropertyKey ? P : never;
};

/**
 * A mutable *or* readonly array. When we're only reading an array, we typically don't care if the array is mutable.
 */
export type Mutable<T> = { -readonly [P in keyof T]: T[P] };
export type MutableDeep<T> = { -readonly [P in keyof T]: MutableDeep<T[P]> };
/**
 * An array that is *either* mutable *or* readonly,
 * satisfying scenarios where you only care about reading
 * values.
 */
export type Readable<T> = Mutable<T> | Readonly<T>;
export type UnwrapReadable<T> = T extends Readable<infer U> ? U : T;

/**
 * Convert any array type into its content type, while
 * preserving non-array types.
 *
 * @example
 * ```ts
 * type unwrapped = ArrayUnwrapped<string[]>; // string
 * type unwrapped = ArrayUnwrapped<string | number>; // string | number
 * type unwrapped = ArrayUnwrapped<string[] | number>; // string | number
 * ```
 */
export type ArrayUnwrapped<T> = T extends Array<infer U> ? U : T;

/**
 * The inverse of {@link ArrayUnwrapped}: convert non-array types
 * to arrays of same, while preserving array types.
 */
export type ArrayWrapped<T> = T extends any[] ? T : [T];

export type ExtractKeysByValue<Container, ValueTypeFilter> = {
  [Key in keyof Container]-?: Container[Key] extends AnyFunction
    ? ValueTypeFilter extends Container[Key]
      ? Key
      : never
    : Container[Key] extends ValueTypeFilter
    ? Key
    : never;
}[keyof Container];

export type ExcludeKeysByValue<Container, ValueTypeFilter> = Exclude<
  keyof Container,
  ExtractKeysByValue<Container, ValueTypeFilter>
>;

export type PickByValue<Container, ValueTypeFilter> = Pick<
  Container,
  ExtractKeysByValue<Container, ValueTypeFilter>
>;

export type OmitByValue<Container, ValueTypeFilter> = Omit<
  Container,
  ExtractKeysByValue<Container, ValueTypeFilter>
>;

export type TupleOf<T, N extends number> = N extends N
  ? number extends N
    ? T[]
    : _TupleOf<T, N, []>
  : never;
type _TupleOf<T, N extends number, R extends unknown[]> = R['length'] extends N
  ? R
  : _TupleOf<T, N, [T, ...R]>;

/**
 * In database contexts, a row/object may have one or more
 * fields that collectively create a unique identifier
 * (a "compound" key or index). This utility type creates
 * a nested object type to represent a compound lookup key.
 *
 * @example
 * ```ts
 * type Example = CompoundLookup<
 *   {field1:'value1',field2:'value2'},
 *   ['field1','field2']
 * >;
 * // {
 * //   value1: {
 * //     value2: {field1:'value1',field2:'value2'}
 * //   }
 * // }
 * ```
 */
export type CompoundLookup<
  T extends Record<string, any>,
  K extends (keyof T)[],
> = K extends [infer First, ...infer Rest]
  ? First extends string
    ? T[First] extends string
      ? {
          [Value in T[First]]: Rest extends (keyof T)[]
            ? CompoundLookup<T, Rest>
            : never;
        }
      : never
    : never
  : T;

interface RegExpExecArray {
  indices?: RegExpIndicesArray;
}

interface RegExpIndicesArray<Groups extends string = string>
  extends Array<[number, number]> {
  groups?: {
    [Name in Groups]: [number, number];
  };
}

export interface RegExpExecArrayWithIndices<Groups extends string = string>
  extends RegExpExecArray {
  indices: RegExpIndicesArray<Groups>;
}
