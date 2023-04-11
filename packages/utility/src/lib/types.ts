import type {
  Defined,
  EmptyArray,
  NonEmptyArray,
  NotNullish,
  Nullish,
} from '../types/utility.js';

export class BscotchUtilError extends Error {
  constructor(message: string, asserter?: (...args: any[]) => any) {
    super(message);
    this.name = 'BscotchUtilError';
    Error.captureStackTrace(this, asserter || this.constructor);
  }
}

export function assert(
  claim: unknown,
  message: string,
  stackStart?: (...args: any[]) => any,
): asserts claim {
  if (!claim) {
    throw new BscotchUtilError(message, stackStart || assert);
  }
}

export function isBoolean(thing: any): thing is boolean {
  return typeof thing === 'boolean';
}

export function isDate(thing: any): thing is Date {
  return thing instanceof Date;
}

export function isValidDate(thing: any): thing is Date {
  return isDate(thing) && !isNaN(thing.getTime());
}

export function assertValidDate(date: any): asserts date is Date {
  assert(isValidDate(date), `${date} is not a valid date`, assertValidDate);
}

export function isArray(thing: any): thing is Array<any> {
  return Array.isArray(thing);
}

export function isEmptyArray(thing: any): thing is EmptyArray {
  return isArray(thing) && thing.length === 0;
}

export function isNonEmptyArray(thing: any): thing is NonEmptyArray<any> {
  return isArray(thing) && thing.length > 0;
}

export function isNullish(thing: any): thing is Nullish {
  return thing === null || thing === undefined;
}

export function isDefined<T>(thing: T): thing is Defined<T> {
  return thing !== undefined;
}

export function isNotNullish<T>(thing: T): thing is NotNullish<T> {
  return !isNullish(thing);
}

export function isString(thing: any): thing is string {
  return typeof thing === 'string';
}

export function isNumber(thing: any): thing is number {
  return typeof thing === 'number';
}

// We can make a function that checks if a string is empty or not,
// where the return *type* is `true` if it is definitely empty, `false`
// if it is definitely not empty, and the more general `boolean` if
// we can't tell.
export function isEmptyString(thing: any): thing is '' {
  return (<any>thing === '') as any;
}

export function isNonEmptyString(thing: any): thing is string {
  return (isString(thing) && !isEmptyString(thing)) as any;
}
