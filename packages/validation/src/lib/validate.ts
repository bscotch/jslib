import { default as Ajv, ValidateFunction } from 'ajv';
import { camelCase, paramCase } from 'change-case';
import { assertUserClaim } from './error.js';
import type { JsonSchema } from './jsonSchema.js';

export declare type JsonSchemaStringFormat = keyof typeof formats;

const formats = {
  'case-param'(value: any) {
    return paramCase(value) == value;
  },
  'case-camel'(value: any) {
    return camelCase(value) == value;
  },
  regex(value: any) {
    return typeof value === 'string';
  },
} as const;

const keywords = ['modifier', 'kind'] as const;

const ajv = new Ajv({
  coerceTypes: 'array',
  useDefaults: true,
  formats: formats,
  keywords: keywords as any,
});

for (const format of Object.keys(formats) as (keyof typeof formats)[]) {
  ajv.addFormat(format, { validate: formats[format] });
}

const validatorCache: WeakMap<
  JsonSchema<any>,
  ValidateFunction
> = new WeakMap();

/**
 * Validate data against a JSON Schema, returning
 * the data if valid else throwing an error.
 *
 * Note that the input data will be mutated to coerce
 * types and/or add defaults, if needed.
 */
export function validate<T>(schema: JsonSchema, data: T): T {
  const validator =
    (schema.$id && ajv.getSchema(schema.$id)) ||
    validatorCache.get(schema) ||
    validatorCache.set(schema, ajv.compile(schema)).get(schema)!;
  const isValid = validator(data);
  assertUserClaim(
    isValid,
    `Invalid data of type ${
      schema.title ? `of type "${schema.title}"` : ''
    }: ${JSON.stringify(validator.errors, null, 2)}`,
  );
  return data;
}
