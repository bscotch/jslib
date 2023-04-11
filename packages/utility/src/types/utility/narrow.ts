// From ts-toolbelt: https://github.com/millsp/ts-toolbelt/blob/master/sources/Function/Narrow.ts
type Narrowable = string | number | bigint | boolean;
export type Narrow<A> =
  | (A extends [] ? [] : never)
  | (A extends Narrowable ? A : never)
  | {
      [K in keyof A]: A[K] extends Function ? A[K] : Narrow<A[K]>;
    };
