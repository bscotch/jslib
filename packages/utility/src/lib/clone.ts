/**
  Deep clones all properties except functions

  Derived from https://github.com/angus-c/just/blob/master/packages/collection-clone/index.mjs
*/
export function clone<T>(obj: T): T {
  let result = obj as any;
  const type = {}.toString.call(obj).slice(8, -1);
  if (type == 'Set') {
    return new Set([...(obj as any)].map((value) => clone(value))) as any;
  }
  if (type == 'Map') {
    return new Map(
      [...(obj as any)].map((kv) => [clone(kv[0]), clone(kv[1])]),
    ) as any;
  }
  if (type == 'Date') {
    return new Date((obj as any).getTime()) as any;
  }
  if (type == 'RegExp') {
    return RegExp((obj as any).source, getRegExpFlags(obj as any)) as any;
  }
  if (type == 'Array' || type == 'Object') {
    result = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
      // include prototype properties
      result[key] = clone(obj[key]);
    }
  }
  // primitives and non-supported objects (e.g. functions) land here
  return result;
}

function getRegExpFlags(regExp: RegExp) {
  if (typeof regExp.flags == 'string') {
    return regExp.flags;
  } else {
    const flags: string[] = [];
    regExp.global && flags.push('g');
    regExp.ignoreCase && flags.push('i');
    regExp.multiline && flags.push('m');
    regExp.sticky && flags.push('y');
    regExp.unicode && flags.push('u');
    return flags.join('');
  }
}
