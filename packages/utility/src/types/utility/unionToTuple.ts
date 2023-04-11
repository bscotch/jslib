type UnionToIntersection<U> = (
  U extends never ? never : (arg: U) => never
) extends (arg: infer I) => void
  ? I
  : never;

/**
 * Convert a union type to a tuple of the distinct
 * types making up the union. Assume relative order
 * is not well defined.
 *
 * @remarks
 * There are two functional approaches, one might be more
 * performant than the other:
 *
 * 1. https://github.com/microsoft/TypeScript/issues/13298#issuecomment-885980381
 * 2. https://github.com/microsoft/TypeScript/issues/13298#issuecomment-707364842
 */
export type UnionToTuple<T> = UnionToIntersection<
  T extends never ? never : (t: T) => T
> extends (_: never) => infer W
  ? [...UnionToTuple<Exclude<T, W>>, W]
  : [];
