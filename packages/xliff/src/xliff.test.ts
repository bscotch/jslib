import { ok } from 'assert';
import fs from 'fs';
import { deepStrictEqual } from 'node:assert';
import { createXliffDocument, parseXliff } from './xliff.js';

const sample = fs.readFileSync('samples/test.xlf', 'utf8');

describe('XLIFF Builder', function () {
  it('can build an XLIFF document', function () {
    const doc = createXliffDocument();
    const file = doc.addFile({ id: 'file1' });
    file.addNote('This is a root note!', { id: 'root-note' });
    file.addNote('This is a another note!', { id: 'another-note' });
    file
      .addUnit({ id: 'root-unit' })
      .addSegment(
        'This is a root segment!',
        'This is a translated root segment!',
      );
    file
      .addUnit({ id: 'other-unit' })
      .addSegment(
        'This is a another segment!',
        'This is a translated another segment!',
      );
    file
      .addGroup({ id: 'group1' })
      .addGroup({ id: 'Nested' })
      .addUnit(
        { id: 'unit1', 'slr:sizeRestriction': 255 },
        'Stuff to translate!',
      )
      .addNote('This is a "note"!');
    const asString = doc.toString();
    ok(asString === sample);
  });
});

describe('XLIFF Parser', function () {
  it('can parse an XLIFF document', async function () {
    const parsed = parseXliff(sample);
    const reference = JSON.parse(
      await fs.promises.readFile('samples/test.json', 'utf8'),
    );
    // await fs.promises.writeFile(
    //   'samples/test.json',
    //   JSON.stringify(parsed, null, 2),
    //   'utf8',
    // );
    // Normalize via JSON to remove keys with undefined values
    deepStrictEqual(JSON.parse(JSON.stringify(parsed)), reference);
  });
});
