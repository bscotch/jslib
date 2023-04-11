export interface Stringifier<Value, Parent = undefined, Key = undefined> {
  /**
   * If this function returns truthy when
   * called on a value, the other options
   * for this stringifier will be used for it.
   *
   * If not provided, this stringifier will
   * be used on *all* values.
   */
  test?: (node: StringifierNode<Value, Parent, Key>) => any;
  ifInstanceof?: new (...args: any[]) => Value;
  skip?: boolean;
  prefix?: string | ((node: StringifierNode<Value, Parent, Key>) => string);
  suffix?: string | ((node: StringifierNode<Value, Parent, Key>) => string);
  /**
   * Optionally override whatever stringification
   * would normally occur.
   */
  stringify?: (node: StringifierNode<Value, Parent, Key>) => string;
}

type AnyStringifier = Stringifier<any, any, any>;

function hasToJSON<T>(value: unknown): value is { toJSON(): T } {
  // @ts-ignore
  return !!(value && value?.toJSON);
}

export function isArray(something: unknown): something is unknown[] {
  return Array.isArray(something);
}

export function isPlainObject(
  something: unknown,
): something is Record<string | symbol, unknown> {
  return (
    something &&
    typeof something == 'object' &&
    !Array.isArray(something) &&
    ((!something.toString ||
      something.toString?.() == '[object Object]') as any)
  );
}

export interface StringifyOptions {
  skipUndefinedObjectValues?: boolean;
  skipNullObjectValues?: boolean;
  skipNullishObjectValues?: boolean;
  /**
   * An array of stringfiers to override the
   * defaults.
   */
  stringifiers: AnyStringifier[];
}

export type StringifierNodeAny = StringifierNode<unknown, unknown, unknown>;

export class StringifierNode<Value, Parent = undefined, Key = undefined> {
  protected constructor(
    protected info: {
      parent: Parent;
      key: Key;
      value: Value;
      depth: number;
      index?: number;
      maxIndex?: number;
    },
  ) {}

  get isRoot(): boolean {
    return !!(this.parent === undefined);
  }

  get parent(): Parent {
    return this.info.parent;
  }

  get parentIsArray(): Parent extends any[] ? true : false {
    return isArray(this.parent) as any;
  }

  get parentIsPlainObject(): Parent extends Record<string | symbol, unknown>
    ? true
    : false {
    return isPlainObject(this.parent) as any;
  }

  get key(): Key {
    return this.info.key;
  }

  get depth(): number {
    return this.info.depth;
  }

  get index(): Parent extends undefined ? undefined : number {
    return this.info.index as any;
  }

  get maxIndex(): Parent extends undefined ? undefined : number {
    return this.info.maxIndex as any;
  }

  get value(): Value {
    return this.info.value;
  }

  protected static findMatchingStringifiers<T extends AnyStringifier>(
    node: StringifierNodeAny,
    stringifiers: T[],
  ) {
    return stringifiers.filter((stringifier) => {
      return stringifier.test
        ? stringifier.test(node)
        : stringifier.ifInstanceof
        ? node.value instanceof stringifier.ifInstanceof
        : true;
    });
  }

  static stringify(data: unknown, options: StringifyOptions): string {
    const skipNull =
      options.skipNullishObjectValues || options.skipNullObjectValues;
    const skipUndefined =
      options.skipNullishObjectValues || options.skipUndefinedObjectValues;

    const recursivelyStringify = (
      node: StringifierNode<unknown, unknown, unknown>,
    ): string => {
      let value = node.value;
      const stringifiers = StringifierNode.findMatchingStringifiers(
        node,
        options.stringifiers,
      );
      if (stringifiers.find((s) => s.skip)) {
        return '';
      }
      value = hasToJSON(value) ? value.toJSON() : value;
      for (const stringifier of stringifiers) {
        if (stringifier.stringify) {
          value = stringifier.stringify(node);
          break;
        }
      }

      if (isArray(value) || isPlainObject(value)) {
        const inArray = isArray(value);
        const props = !inArray && Object.keys(value);
        const size = inArray
          ? (value as unknown[]).length
          : (props as (string | symbol)[]).length;
        const asStrings: string[] = [];

        for (let index = 0; index < size; index++) {
          const key = props ? props[index] : index;
          const keyValue: unknown = (value as any)[key];
          const skip =
            !inArray &&
            ((skipNull && keyValue == null) ||
              (skipUndefined && keyValue === undefined));
          if (skip) {
            continue;
          }
          const asString = recursivelyStringify(
            new StringifierNode({
              depth: node.depth + 1,
              parent: value,
              key,
              value: keyValue,
              index: index,
              maxIndex: size - 1,
            }),
          );
          asStrings.push(asString || '');
        }
        value = asStrings.join('');
      }
      let asString = typeof value === 'string' ? value : '';
      for (const stringifier of stringifiers) {
        const prefix =
          typeof stringifier.prefix === 'function'
            ? stringifier.prefix(node)
            : stringifier.prefix || '';
        const suffix =
          typeof stringifier.suffix === 'function'
            ? stringifier.suffix(node)
            : stringifier.suffix || '';
        asString = `${prefix}${asString}${suffix}`;
      }
      return asString;
    };
    return recursivelyStringify(
      new StringifierNode({
        depth: 0,
        value: data,
        parent: undefined,
        key: undefined,
      }),
    );
  }
}
