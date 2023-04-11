/**
 * primitives: value1 === value2
 * functions: value1.toString == value2.* toString
 * arrays: if length, sequence and values of * properties are identical
 * objects: if length, names and values of * properties are identical
 */

export function deepEquals(value1: any, value2: any): boolean {
  if (value1 === value2) {
    return true;
  }

  // if both values are NaNs return true
  if (value1 !== value1 && value2 !== value2) {
    return true;
  }

  if (
    typeof value1 != typeof value2 || // primitive != primitive wrapper
    {}.toString.call(value1) != {}.toString.call(value2) // check for other (maybe nullish) objects
  ) {
    return false;
  }

  if (value1 !== Object(value1)) {
    // non equal primitives
    return false;
  }

  if (!value1) {
    return false;
  }

  if (Array.isArray(value1)) {
    return compareArrays(value1, value2);
  }

  if ({}.toString.call(value1) == '[object Set]') {
    return compareArrays(Array.from(value1), Array.from(value2));
  }

  if ({}.toString.call(value1) == '[object Object]') {
    return compareObjects(value1, value2);
  }

  return compareNativeSubtypes(value1, value2);
}

function compareNativeSubtypes(value1: any, value2: any) {
  // e.g. Function, RegExp, Date
  return value1.toString() === value2.toString();
}

function compareArrays(value1: any[], value2: any[]) {
  if (value1.length != value2.length) {
    return false;
  }

  for (let i = 0; i < value1.length; i++) {
    if (!deepEquals(value1[i], value2[i])) {
      return false;
    }
  }

  return true;
}

function compareObjects(value1: any, value2: any) {
  const keys1 = Object.keys(value1);
  const len = keys1.length;

  if (len != Object.keys(value2).length) {
    return false;
  }

  for (let i = 0; i < len; i++) {
    const key1 = keys1[i];

    if (
      !(value2.hasOwnProperty(key1) && deepEquals(value1[key1], value2[key1]))
    ) {
      return false;
    }
  }

  return true;
}
