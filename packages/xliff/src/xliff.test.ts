import { ok } from 'assert';
import fs from 'fs';
import { format } from './utility.test.js';
import { createXliffDocument } from './xliff.js';

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
    const expected = fs.readFileSync('samples/test.xlf', 'utf8');
    ok(format(doc) === format(expected));
  });
});
