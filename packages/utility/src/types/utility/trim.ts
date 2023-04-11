export type TrimLeft<
  T extends string,
  U extends string = ' ',
> = T extends `${U}${infer R extends string}` ? TrimLeft<R, U> : T;
export type TrimRight<
  T extends string,
  U extends string = ' ',
> = T extends `${infer R extends string}${U}` ? TrimRight<R, U> : T;
export type Trim<T extends string, U extends string = ' '> = TrimLeft<
  TrimRight<T, U>,
  U
>;
