import { stringify } from './stringify.lib.js';
import { isArray, isPlainObject, Stringifier } from './stringify.node.js';

export function jsonStringify(
  data: unknown,
  options?: { spaces?: string | number; excludeFinalNewline?: boolean },
): string {
  const space =
    typeof options?.spaces === 'number'
      ? ' '.repeat(options.spaces)
      : options?.spaces || '';
  const indent = (depth: number) => space.repeat(depth);
  const inlineSpace = space ? ' ' : '';
  const newline = space ? '\n' : '';

  const stringifiers: Stringifier<any>[] = [
    {
      test: (node) => typeof node.value === 'function',
      skip: true,
    },
    {
      test(node) {
        // Is array or non-built-in-object
        return isArray(node.value) || isPlainObject(node.value);
      },
      prefix(node) {
        if (isArray(node.value)) {
          return `[${node.value.length ? newline : ''}`;
        } else if (isPlainObject(node.value)) {
          return `{${Object.keys(node.value).length ? newline : ''}`;
        }
        return '';
      },
      suffix(node) {
        const end = node.isRoot && options?.excludeFinalNewline ? '' : newline;
        if (isArray(node.value)) {
          return `${node.value.length ? `${indent(node.depth)}` : ''}]${end}`;
        } else if (isPlainObject(node.value)) {
          return `${
            Object.keys(node.value).length ? `${indent(node.depth)}` : ''
          }}${end}`;
        }
        return '';
      },
    },
    {
      test(node) {
        // Is inside an object
        return isArray(node.parent) || isPlainObject(node.parent);
      },
      prefix(node) {
        return isArray(node.parent)
          ? indent(node.depth)
          : `${indent(node.depth)}"${node.key}":${inlineSpace}`;
      },
    },
    {
      test(node) {
        return !(isArray(node.value) || isPlainObject(node.value));
      },
      stringify(node) {
        let value = node.value;
        value = value instanceof Date ? value.toISOString() : value;
        value = value instanceof RegExp ? value.source : value;
        let asString = typeof value === 'string' ? `"${value}"` : `${value}`;
        if (!node.isRoot) {
          const sep = node.index! < node.maxIndex! ? ',' : '';
          asString += `${sep}${newline}`;
        }
        return asString;
      },
    },
  ];

  return stringify(data, { stringifiers, skipUndefinedObjectValues: true });
}
