import formatXml from 'xml-formatter';
import type { GlossMLDocumentBuilder } from './glossml.js';
import type { XliffDocumentBuilder } from './xliff.js';

export function format(
  xml: string | GlossMLDocumentBuilder | XliffDocumentBuilder,
) {
  return formatXml(xml.toString(), {
    indentation: '  ',
    lineSeparator: '\n',
  }).trim();
}

export function minify(
  xml: string | GlossMLDocumentBuilder | XliffDocumentBuilder,
) {
  return formatXml.minify(xml.toString());
}
