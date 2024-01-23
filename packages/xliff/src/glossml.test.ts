import { ok } from 'assert';
import fs from 'fs/promises';
import { createGlossMLDocument, glossMlExtension } from './glossml.js';
import { format } from './utility.test.js';

describe('GlossML Builder', function () {
  it('can build an XLIFF document', async function () {
    const doc = createGlossMLDocument();
    doc.comment = 'A description of the glossary itself';
    doc
      .addEntry('term1', 'definition1', 'comment1')
      .addEntry('term2')
      .addEntry('term3', undefined, 'comment3');
    const expected = await fs.readFile(
      `samples/test.${glossMlExtension}`,
      'utf8',
    );
    ok(format(doc) === format(expected));
  });
});
