# XLIFF Builder

A library for programmatically building simple [XLIFF 2.0](https://dev.maxprograms.com/Validation/) files, assisted by Typescript.

## Usage

The following sample code:

```ts
import { createXliffDocument } from '@bscotch/xliff';

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

console.log(doc.toString());
```

Produces the following XLIFF (after formatting):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" srcLang="en-us" xmlns="urn:oasis:names:tc:xliff:document:2.0" xmlns:slr="urn:oasis:names:tc:xliff:sizerestriction:2.0">
  <file id="file1">
    <group id="group1">
      <group id="Nested">
        <unit id="unit1" slr:sizeRestriction="255">
          <notes>
            <note>
              This is a &quot;note&quot;!
            </note>
          </notes>
          <segment>
            <source>
              Stuff to translate!
            </source>
          </segment>
        </unit>
      </group>
    </group>
  </file>
</xliff>
```

## Limitations

This library is intended to be used for simple XLIFF files, and does not support all features of the XLIFF 2.0 specification.

The resulting XML strings are formatted as a single line, so you may want to run them through a pretty-printer like [xml-formatter](https://www.npmjs.com/package/xml-formatter).
