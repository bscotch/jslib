import { ok } from 'assert';
import fs from 'fs';
import formatXml from 'xml-formatter';
import { createXliffDocument } from './builder.js';

describe('XLIFF Builder', function () {
  it('can build an XLIFF document', function () {
    const doc = createXliffDocument();
    doc
      .addFile({ id: 'file1' })
      .addGroup({ id: 'group1' })
      .addGroup({ id: 'Nested' })
      .addUnit(
        { id: 'unit1', 'slr:sizeRestriction': 255 },
        'Stuff to translate!',
      )
      .addNote('This is a "note"!');
    const asString = formatXml(doc.toString(), { indentation: '  ' });
    const expected = fs.readFileSync('samples/test.xlf', 'utf8');
    ok(asString === expected);
    // fs.writeFileSync('test.xlf', );
  });
});
