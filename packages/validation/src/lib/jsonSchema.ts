import { JsonSchemaTypeName, schemaType } from './jsonSchema.lib.js';
import type { JsonSchema } from './jsonSchema.types.js';

export * from './jsonSchema.types.js';
export type JsonPointerParsed = (string | number)[];

/**
 * Convert a JSON Schema into a collection of
 * nested nodes with helper methods.
 *
 * Assumes a dereferenced Schema.
 *
 * **⚠ VERY INCOMPLETE ⚠**
 *
 * @alpha
 */
export class JsonSchemaNode<Schema extends JsonSchema = JsonSchema> {
  protected parent: JsonSchemaNode;

  protected _properties?: Map<string | undefined, JsonSchemaNode>;
  protected _required: boolean | undefined;
  protected _schemaPointers: Map<string, JsonSchemaNode> = new Map();
  protected _dataPointers: Map<string, JsonSchemaNode> = new Map();

  constructor(
    readonly subschema: Schema,
    rootNode?: JsonSchemaNode,
    /**
     * Pointer from the root node to this
     * node, as a parsed JSON pointer
     * (i.e. split on `/`).
     */
    protected schemaPointer: (string | number)[] = [],
    protected dataPointer: (string | number)[] = [],
  ) {
    this.parent = rootNode || (this as unknown as JsonSchemaNode);
    this.addPointers(schemaPointer, dataPointer);

    if ('properties' in subschema) {
      this._properties = new Map();
      const required = subschema.required || [];
      for (const key of Object.keys(subschema.properties || {})) {
        const property = new JsonSchemaNode(
          subschema.properties![key],
          this.parent,
          [...schemaPointer, 'properties', key],
          [...dataPointer, key],
        );
        if (required.includes(key)) {
          property.required = true;
        }
        this._properties!.set(key, property);
      }
    } else if ('items' in subschema) {
      if (Array.isArray(subschema.items)) {
        for (const [i, item] of subschema.items.entries()) {
          new JsonSchemaNode(
            item,
            this.parent,
            [...schemaPointer, 'items', i],
            [...dataPointer, i],
          );
        }
      } else {
        new JsonSchemaNode(
          subschema.items!,
          this.parent,
          [...schemaPointer, 'items'],
          [...dataPointer, 0],
        );
      }
    }
  }

  get title() {
    return this.subschema.title;
  }

  get description() {
    return this.subschema.description;
  }

  /**
   * The terminal portion of the pointer
   * to this node. A number if this node
   * is within an array, else a string.
   */
  get key() {
    return this.schemaPointer.at(-1);
  }

  get schemaPointerString() {
    return this.schemaPointer.join('/');
  }

  get dataPointerString() {
    return this.dataPointer.join('/');
  }

  protected set required(required: boolean) {
    this._required = required;
  }

  properties(): JsonSchemaNode[] {
    return [...(this._properties?.values() || [])];
  }

  isRoot(): boolean {
    return this.parent === this;
  }

  isRequired(): boolean {
    return this._required === true;
  }

  default() {
    return this.subschema.default;
  }

  type(): JsonSchemaTypeName<Schema> {
    return schemaType(this.subschema);
  }

  resolveSchemaPointer(pointer: string): JsonSchemaNode | undefined {
    return this._schemaPointers.get(pointer);
  }

  resolveDataPointer(pointer: string): JsonSchemaNode | undefined {
    return this._dataPointers.get(pointer);
  }

  protected addPointers(
    schemaPointer: JsonPointerParsed,
    dataPointer: JsonPointerParsed,
  ) {
    this._schemaPointers = new Map();
    this._dataPointers = new Map();
    let depth = -1;
    let to: JsonSchemaNode = this;
    while (true) {
      const schemaPointerString = schemaPointer.slice(depth).join('/');
      const dataPointerString = dataPointer.slice(depth).join('/');
      to._schemaPointers.set(schemaPointerString, this);
      to._dataPointers.set(dataPointerString, this);
      depth--;
      if (to.isRoot()) {
        break;
      }
      to = to.parent;
    }
  }
}
