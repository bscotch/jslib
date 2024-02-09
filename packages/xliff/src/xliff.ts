// Classes representing the XLIFF document structure: https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html#d0e1524

import { XliffDocumentBuilder } from './xliff.builder.js';
export * from './xliff.builder.js';
export * from './xliff.parser.js';
export type * from './xliff.types.js';

export const xliffExtension = 'xlf';
export const xliffMimetype = 'application/xliff+xml';

export function createXliffDocument(
  ...args: ConstructorParameters<typeof XliffDocumentBuilder>
) {
  return new XliffDocumentBuilder(...args);
}
