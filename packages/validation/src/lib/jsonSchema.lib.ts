import type {
  JsonSchema,
  JsonSchemaArray,
  JsonSchemaBoolean,
  JsonSchemaConst,
  JsonSchemaEnum,
  JsonSchemaNumber,
  JsonSchemaObject,
  JsonSchemaRef,
  JsonSchemaString,
} from './jsonSchema.types.js';

export type JsonSchemaTypeName<Schema extends JsonSchema> =
  Schema extends JsonSchemaArray
    ? 'array'
    : Schema extends JsonSchemaBoolean
    ? 'boolean'
    : Schema extends JsonSchemaConst
    ? 'const'
    : Schema extends JsonSchemaEnum
    ? 'enum'
    : Schema extends JsonSchemaNumber
    ? 'number'
    : Schema extends JsonSchemaObject
    ? 'object'
    : Schema extends JsonSchemaString
    ? 'string'
    : Schema extends JsonSchemaRef
    ? 'ref'
    : never;

export function schemaType<Schema extends JsonSchema>(
  schema: JsonSchema,
): JsonSchemaTypeName<Schema> {
  if ('type' in schema) {
    // @ts-expect-error
    return schema.type;
  } else if ('enum' in schema) {
    // @ts-expect-error
    return 'enum';
  } else if ('const' in schema) {
    // @ts-expect-error
    return 'const';
  } else if ('$ref' in schema) {
    // @ts-expect-error
    return 'ref';
  }
  throw new Error(`Cannot determine node type ${JSON.stringify(schema)}`);
}

export const is = {
  array: (schema: JsonSchema): schema is JsonSchemaArray =>
    schemaType(schema) === 'array',
  boolean: (schema: JsonSchema): schema is JsonSchemaBoolean =>
    schemaType(schema) === 'boolean',
  const: (schema: JsonSchema): schema is JsonSchemaConst =>
    schemaType(schema) === 'const',
  enum: (schema: JsonSchema): schema is JsonSchemaEnum =>
    schemaType(schema) === 'enum',
  number: (schema: JsonSchema): schema is JsonSchemaNumber =>
    schemaType(schema) === 'number',
  object: (schema: JsonSchema): schema is JsonSchemaObject =>
    schemaType(schema) === 'object',
  string: (schema: JsonSchema): schema is JsonSchemaString =>
    schemaType(schema) === 'string',
  ref: (schema: JsonSchema): schema is JsonSchemaRef =>
    schemaType(schema) === 'ref',
};
