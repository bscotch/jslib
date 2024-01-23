// Classes representing the GlossML 1.0 document structure: https://www.maxprograms.com/glossml/glossml.pdf

import { assert, escapeXmlText } from './utility.js';

export const glossMlExtension = 'gls';
export const glossMlMimetype = 'application/glossml+xml';

export function createGlossMLDocument(
  ...args: ConstructorParameters<typeof GlossMLDocumentBuilder>
) {
  return new GlossMLDocumentBuilder(...args);
}

export class GlossMLDocumentBuilder {
  constructor(readonly srcLang = 'en-US') {}

  /** A comment describing the glossary. */
  public comment?: string;

  entries: { comment?: string; term: string; definition?: string }[] = [];

  addEntry(term: string, definition?: string, comment?: string): this {
    assert(term, 'term is required');
    this.entries.push({ term, definition, comment });
    return this;
  }

  toString(): string {
    const entriesAsXml = this.entries.map((entry) => {
      let xml = '';
      if (entry.comment) {
        xml += `<comment>${escapeXmlText(entry.comment)}</comment>`;
      }
      xml += `<langentry xml:lang="${this.srcLang}"><term>${escapeXmlText(
        entry.term,
      )}</term>`;
      if (entry.definition) {
        xml += `<definition>${escapeXmlText(entry.definition)}</definition>`;
      }
      xml += '</langentry>';
      return `<glossentry>${xml}</glossentry>`;
    });

    return `<?xml version="1.0" encoding="UTF-8" ?>\n<glossary version="1.0" srcLang="${
      this.srcLang
    }" xmlns="http://www.maxprograms.com/gml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.maxprograms.com/glossml/GlossML.xsd">${entriesAsXml.join(
      ' ',
    )}</glossary>`;
  }
}
