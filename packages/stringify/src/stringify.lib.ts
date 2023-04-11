import { StringifierNode, StringifyOptions } from './stringify.node.js';

export function createStringifier(options: StringifyOptions) {
  return function stringifier(data: unknown) {
    return StringifierNode.stringify(data, options);
  };
}

export const stringify = StringifierNode.stringify;
