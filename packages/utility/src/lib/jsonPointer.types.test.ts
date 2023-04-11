/**
 * This file contains Typescript that should all pass type-checks
 * if the JSON Pointer types are working as expected.
 *
 * If they are not working, `tsc` should throw errors on type-check.
 */

import type {
  JsonPointerParse,
  JsonPointerStringify,
} from './jsonPointer.types.js';

type Valid<WideType, NarrowType> = NarrowType extends WideType ? true : false;
type Passing<T extends true[]> = T;
type Failing<T extends false[]> = T;

type ValidJsonPointerStringifies = Passing<
  [
    Valid<JsonPointerStringify<['hello', 'world', 10]>, '/hello/world/10'>,
    Valid<JsonPointerStringify<['hello', number]>[], ['/hello/10', '/hello/-']>,
    Valid<JsonPointerStringify<['hello', 'world', '']>, '/hello/world/'>,
    Valid<JsonPointerStringify<['']>, '/'>,
    Valid<JsonPointerStringify<[]>, ''>,
    Valid<
      JsonPointerStringify<[string, number]>[],
      [`/a-string/10`, '/another-string/5', '/again/-']
    >,
    // A wide type just returns `string`
    Valid<
      JsonPointerStringify<(string | number)[]>[],
      [`/10/10`, '/4/5/a/b/-', '/-/-/-/anything-goes', string]
    >,
  ]
>;

type InvalidJsonPointerStringifies = Failing<
  [
    Valid<JsonPointerStringify<['hello', 'world', 10]>, '/hello/world/-'>,
    Valid<
      JsonPointerStringify<['hello', number]>[],
      ['/hello/goodbye/10', 'hello/-']
    >,
    Valid<JsonPointerStringify<['hello', 'world', '']>, '/hello/world'>,
    Valid<JsonPointerStringify<['']>, ''>,
    Valid<JsonPointerStringify<[]>, '/'>,
    Valid<
      JsonPointerStringify<[string, number]>[],
      [`/10/10`, '/another-string/five']
    >,
  ]
>;

type ValidJsonPointerParses = Passing<
  [
    Valid<JsonPointerParse<'/hello/world/10'>, ['hello', 'world', 10]>,
    Valid<JsonPointerParse<'/hello/world/-'>, ['hello', 'world', 10]>,
    Valid<JsonPointerParse<`/hello/world/${number}`>, ['hello', 'world', 10]>,
    Valid<
      JsonPointerParse<`/${string}/world/${number}`>,
      ['hello', 'world', 10]
    >,
    Valid<JsonPointerParse<`/hello/world/`>, ['hello', 'world', '']>,
  ]
>;

type InvalidJsonPointerParses = Failing<
  [
    Valid<JsonPointerParse<'/hello/world/10'>, ['hello', 'world', 'hello']>,
    Valid<JsonPointerParse<'/hello/world/-'>, ['hello', 'world']>,
    Valid<
      JsonPointerParse<`/hello/world/${number}`>,
      ['hello', 'world', 'Not a Number']
    >,
    Valid<JsonPointerParse<`/${string}/world/${number}`>, [100, 'world', 10]>,
    Valid<JsonPointerParse<`/hello/world/`>, ['hello', 'world']>,
  ]
>;
