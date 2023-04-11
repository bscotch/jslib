export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/**
 * A "plain object" is a non-built-in object that is not a `Function` or `Array`, though it could be a custom class
 * instance.
 */
export type PlainObject<T> = T extends
  | Primitive
  | Function
  | Date
  | RegExp
  | Error
  | any[]
  ? never
  : T extends { [key: string | symbol]: unknown }
  ? T
  : unknown;
