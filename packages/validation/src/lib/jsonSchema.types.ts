/**
 * Derived from [`@types/json-schema`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/json-schema),
 * with separation of keywords by type to make it
 * easier to author schemas using intellisense provided by
 * the type.
 *
 * For [JSON Schema Draft 07](https://tools.ietf.org/html/draft-handrews-json-schema-validation-01).
 *
 * Does not follow *all* JSON Spec rules, adds additional
 * constraints, and includes non-spec keywords used by
 * various tools.
 *
 * The goal is to have types that supports writing
 * schemas that are broadly consumable by tools, rather
 * than to faithfully implement the exact spec.
 */

import type { O } from 'ts-toolbelt';

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
export type JsonSchemaTypeName =
  | 'string'
  | 'number'
  | 'integer'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null';

/**
 * Primitive type
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.1.1
 */
export type JsonData = any;

export type JsonArray = JsonData[];

export type JsonObject = { [key: string]: JsonData };

/**
 * Meta schema
 *
 * Recommended values:
 * - 'http://json-schema.org/schema#'
 * - 'http://json-schema.org/hyper-schema#'
 * - 'http://json-schema.org/draft-07/schema#'
 * - 'http://json-schema.org/draft-07/hyper-schema#'
 *
 * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-5
 */
export type JsonSchemaVersion = string;

export type JsonSchemaDefinitionField = '$defs' | 'definitions';

export interface JsonSchemaConditional {
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.6
   */
  if?: JsonSchema;
  then?: JsonSchema;
  else?: JsonSchema;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.7
   */
  allOf?: JsonSchema[];
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
  not?: JsonSchema;
}

export interface JsonSchemaCommon extends JsonSchemaConditional {
  title?: string;
  description?: string;
  $comment?: string;

  $id?: string;
  $schema?: JsonSchemaVersion;

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-10
   */
  readOnly?: boolean;
  writeOnly?: boolean;
  default?: JsonData;
  examples?: JsonData;

  /**
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-00#section-8.2.4
   * @see https://datatracker.ietf.org/doc/html/draft-bhutton-json-schema-validation-00#appendix-A
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-9
   */
  $defs?: {
    [key: string]: JsonSchema;
  };
  definitions?: {
    [key: string]: JsonSchema;
  };
}

export interface JsonSchemaRef extends JsonSchemaCommon {
  $ref?: string;
}

export interface JsonSchemaEnum<T extends JsonData = JsonData>
  extends JsonSchemaCommon {
  enum: ReadonlyArray<T> | T[];
}

export interface JsonSchemaConst<T extends JsonData = JsonData>
  extends JsonSchemaCommon {
  const: T;
}

export interface JsonSchemaBoolean extends JsonSchemaCommon {
  type: 'boolean';
}

export interface JsonSchemaNull extends JsonSchemaCommon {
  type: 'null';
}

export interface JsonSchemaNumber<Format extends string = string>
  extends JsonSchemaCommon {
  type: 'number' | 'integer';
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.2
   */
  multipleOf?: number;
  maximum?: number;
  exclusiveMaximum?: number;
  minimum?: number;
  exclusiveMinimum?: number;

  /**
   * Includes common [AJV formats](https://www.npmjs.com/package/ajv-formats)
   */
  format?: Format;
}

export interface JsonSchemaString<Format extends string = string>
  extends JsonSchemaCommon {
  type: 'string';

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.3
   */
  maxLength?: number;
  minLength?: number;
  pattern?: string;
  format?: Format;
}

export interface JsonSchemaArray<T extends JsonArray = JsonArray>
  extends JsonSchemaCommon {
  type: 'array';

  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.4
   */
  items?: JsonSchema<T[number]>[] | JsonSchema<T[number]>;
  additionalItems?: JsonSchema<T[number]>;
  maxItems?: number;
  minItems?: number;
  uniqueItems?: boolean;
  contains?: JsonSchema<T[number]>;
}

export interface JsonSchemaObject<T extends JsonObject = JsonObject>
  extends JsonSchemaCommon {
  type: 'object';
  /**
   * @see https://tools.ietf.org/html/draft-handrews-json-schema-validation-01#section-6.5
   */
  maxProperties?: number;
  minProperties?: number;
  required?: string extends keyof T
    ? ReadonlyArray<string> | string[]
    : O.CompulsoryKeys<T>[] | ReadonlyArray<O.CompulsoryKeys<T>>;
  properties?: {
    [Key in keyof T]: JsonSchema<T[Key]>;
  };
  patternProperties?: {
    [key: string]: JsonSchema<T[keyof T]>;
  };
  additionalProperties?: false | JsonSchema<T[keyof T]>;
}

export type JsonSchema<T = any> =
  | JsonSchemaRef
  | JsonSchemaEnum<T>
  | JsonSchemaConst<T>
  | (T extends boolean
      ? JsonSchemaBoolean
      : T extends null
      ? JsonSchemaNull
      : T extends number
      ? JsonSchemaNumber
      : T extends string
      ? JsonSchemaString<T>
      : T extends Array<any>
      ? JsonSchemaArray<T>
      : T extends JsonObject
      ? JsonSchemaObject<T>
      : never);
