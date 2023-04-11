import type {
  ArrayWrapped,
  Defined,
  EmptyArray,
  NotFalsey,
  NotNullish,
} from '../types/utility.js';
import type { Narrow } from '../types/utility/narrow.js';

/**
 * Create a generator that yields each
 * subsequent number from some start point
 * to some end point (inclusive). If the
 * second number is smaller than the first,
 * will yield descending. Numbers are floored.
 */
export function* nextNumberUntil(start: number, end: number) {
  start = Math.floor(start);
  end = Math.floor(end);
  const descending = start > end;
  for (
    let i = start;
    descending ? i >= end : i <= end;
    descending ? i-- : i++
  ) {
    yield i;
  }
}

export default { nextNumberUntil };

export function literal<T>(v: Narrow<T>): T {
  return v as T;
}

export function filterTruthy<T>(array: T[]): NotFalsey<T>[] {
  return array.filter((x) => x) as any;
}

export function filterDefined<T>(array: T[]): Defined<T>[] {
  return array.filter((x) => x !== undefined) as any;
}

export function filterNotNullish<T>(array: T[]): NotNullish<T>[] {
  return array.filter((x) => ![undefined, null].includes(x as any)) as any;
}

/**
 * If the provided value is not an array,
 * wrap it in an array. If the value is undefined
 * will return an empty array.
 */
export function arrayWrapped<T>(
  item: T,
): T extends undefined ? EmptyArray : ArrayWrapped<T> {
  if (Array.isArray(item)) {
    // @ts-expect-error Help! Does work, but Typescript doesn't like it.
    return item;
  }
  // @ts-expect-error Help! Does work, but Typescript doesn't like it.
  return typeof item == 'undefined' ? [] : [item];
}

/**
 * Return `true` if the `comparison` function returns true
 * when applied to each adjacent pair of values. For example,
 * can be used to determine if an array of numbers is increasing
 * with `(current,last)=>current>last`.
 *
 * If the array has zero or one entry, `true`
 * is returned.
 */
export function arrayEveryPair<ArrayOfComparables extends any[]>(
  arrayOfComparables: ArrayOfComparables,
  comparison: (
    currentValue: ArrayOfComparables[number],
    lastValue: ArrayOfComparables[number],
  ) => boolean,
) {
  return arrayOfComparables.every(
    (value: ArrayOfComparables[number], i: number) => {
      if (i === 0) {
        return true;
      }
      return comparison(value, arrayOfComparables[i - 1]);
    },
  );
}

export function arrayWithoutNullish<T>(array: T[]): NotNullish<T>[] {
  return array.filter(
    (x) => ![undefined, null].includes(x as any),
  ) as NotNullish<T>[];
}

/**
 * Return true if each value is greater than the last
 */
export function arrayIsIncreasing<ArrayOfValues extends any[]>(
  increasingArray: ArrayOfValues,
) {
  return arrayEveryPair(
    increasingArray,
    (curr: ArrayOfValues[number], last: ArrayOfValues[number]) => curr > last,
  );
}

/**
 * Returns `true` if every entry is the same.
 * Uses a strict-equal (`===`) comparison by
 * default.
 */
export function arrayIsDuplicates<ArrayOfValues extends any[]>(
  arr: ArrayOfValues,
  options?: { loose?: boolean },
) {
  return arrayEveryPair(arr, (a, b) => (options?.loose ? a == b : a === b));
}

/**
 * Return true if each value is greater than the last
 */
export function arrayIsDecreasing<ArrayOfValues extends any[]>(
  decreasingArray: ArrayOfValues,
) {
  return arrayEveryPair(
    decreasingArray,
    (curr: ArrayOfValues[number], last: ArrayOfValues[number]) => curr < last,
  );
}

type FirstItemArray<Item> =
  | Item[]
  | [Item, ...any[]]
  | Readonly<[Item, ...any[]]>
  | EmptyArray;

/**
 * If not an array, return self. Otherwise return 0th item.
 */
export function arrayUnwrapped<Item>(
  items: FirstItemArray<Item> | Item,
): Item extends EmptyArray ? undefined : Item {
  if (items instanceof Array) {
    // @ts-expect-error can't figure out how to get this to behave,
    // but it does work as intended!
    return items[0];
  }
  // @ts-expect-error (see prior comment)
  return items;
}

type SortReturn = number;

function sortResult<N extends number[]>(
  numbers: N,
  descending?: boolean,
): number[];
function sortResult<N extends number>(
  array1Item: N,
  array2Item: N,
  descending?: boolean,
): SortReturn;
function sortResult<N extends number | number[]>(
  numbersOrArrayItem1: N,
  array2ItemOrDescending?: number | boolean,
  descending = false,
): N extends number ? SortReturn : number[] {
  if (typeof numbersOrArrayItem1 == 'number') {
    if (typeof array2ItemOrDescending != 'number') {
      throw new Error('Second argument must be a number');
    }
    const diff = numbersOrArrayItem1 - array2ItemOrDescending;
    // @ts-ignore
    return descending ? -diff : diff;
  } else if (Array.isArray(numbersOrArrayItem1)) {
    // @ts-ignore
    return numbersOrArrayItem1.sort((a, b) => sortResult(a, b, descending));
  }
  throw new Error('Invalid arguments for arraySortNumeric');
}

/**
 * Ascending-sort an array of numeric values.
 * Can call on an array, or pass to `Array.sort`
 *
 * ```js
 * const array = [10,3,11];
 * // Both ways work
 * arraySortNumeric(array);
 * array.sort(arraySortNumeric);
 * ```
 */
export function arraySortNumeric<N extends number[]>(numbers: N): number[];
export function arraySortNumeric<N extends number>(
  array1Item: N,
  array2Item: N,
): SortReturn;
export function arraySortNumeric<N extends number | number[]>(
  numbersOrArrayItem1: N,
  array2Item?: number,
): N extends number ? SortReturn : number[] {
  // @ts-ignore
  return sortResult(numbersOrArrayItem1, array2Item);
}

/**
 * Descending-sort an array of numeric values.
 * Can call on an array, or pass to `Array.sort`
 *
 * ```js
 * const array = [10,3,11];
 * // Both ways work
 * arraySortNumericDescending(array);
 * array.sort(arraySortNumericDescending);
 * ```
 */
export function arraySortNumericDescending<N extends number[]>(
  numbers: N,
): number[];
export function arraySortNumericDescending<N extends number>(
  array1Item: N,
  array2Item: N,
): SortReturn;
export function arraySortNumericDescending<N extends number | number[]>(
  numbersOrArrayItem1: N,
  array2Item?: number,
): N extends number ? SortReturn : number[] {
  // @ts-ignore
  return sortResult(numbersOrArrayItem1, array2Item, true);
}

/**
 * Find an object in an array by one of its fields.
 *
 * For the value, use {@link findByField}
 */
export function findIndexByField<T>(
  arr: T[],
  field: keyof T,
  value: T[keyof T],
): number {
  return arr.findIndex((item) => item[field] === value);
}

/**
 * Find an object in an array by one of its fields.
 *
 * For the index position, use {@link findIndexByField}
 */
export function findByField<T>(arr: T[], field: keyof T, value: T[keyof T]): T {
  return arr[findIndexByField(arr, field, value)];
}

/**
 * Find an object in an array, and its index position, by one of its fields.
 */
export function findEntryAndIndexByField<T>(
  arr: T[],
  field: keyof T,
  value: T[keyof T],
): [entry: T, index: number] {
  const idx = arr.findIndex((item) => item[field] === value);
  return [arr[idx], idx];
}
