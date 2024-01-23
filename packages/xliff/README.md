# XLIFF & GlossML Builder

A library for programmatically building simple [XLIFF 2.0](https://dev.maxprograms.com/Validation/) and [GlossML 1.0](https://www.maxprograms.com/articles/glossml.html) files, assisted by Typescript.

## Usage

### XLIFF

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

### GlossML

The following sample code:

```ts
import { createGlossMLDocument } from '@bscotch/xliff';

const doc = createGlossMLDocument();
doc.comment = 'A description of the glossary itself';
doc
  .addEntry('term1', 'definition1', 'comment1')
  .addEntry('term2')
  .addEntry('term3', undefined, 'comment3');
```

Produces the following GlossML file (after formatting):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<glossary version="1.0" srcLang="en-US" xmlns="http://www.maxprograms.com/gml" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="https://www.maxprograms.com/glossml/GlossML.xsd">
  <glossentry>
    <comment>
      comment1
    </comment>
    <langentry xml:lang="en-US">
      <term>
        term1
      </term>
      <definition>
        definition1
      </definition>
    </langentry>
  </glossentry>
  <glossentry>
    <langentry xml:lang="en-US">
      <term>
        term2
      </term>
    </langentry>
  </glossentry>
  <glossentry>
    <comment>
      comment3
    </comment>
    <langentry xml:lang="en-US">
      <term>
        term3
      </term>
    </langentry>
  </glossentry>
</glossary>
```

## Limitations

This library is intended to be used for simple files, and does not support all features of either format.

The resulting XML strings are formatted as a single line, so you may want to run them through a pretty-printer like [xml-formatter](https://www.npmjs.com/package/xml-formatter).
