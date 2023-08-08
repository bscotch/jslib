import formatXml from 'xml-formatter';
import { createXliffDocument } from './builder.js';

describe('XLIFF Builder', function () {
  it('can build an XLIFF document', function () {
    const doc = createXliffDocument();
    const unit = doc
      .addFile({ id: 'file1' })
      .addGroup({ id: 'group1' })
      .addGroup({ id: 'Nested' })
      .addUnit({ id: 'unit1', 'slr:sizeRestriction': 255 });
    unit.addNote('This is a "note"!').addSegment('Stuff to translate!');
    console.log(formatXml(doc.toXml()));
  });
});
