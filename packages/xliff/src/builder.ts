// Classes representing the XLIFF document structure: https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html#d0e1524

import { assert, attributesToString, escapeXmlText } from './utility.js';

export function createXliffDocument(
  ...args: ConstructorParameters<typeof XliffDocumentBuilder>
) {
  return new XliffDocumentBuilder(...args);
}

interface XliffSizeRestrictionAttributes {
  /**
   * The maximum string size. Defaults to '*' (Infinity).
   * If a single number is provided, that is the maximum size
   * and the minimum is 0. If an array of two numbers is provided,
   * the first is the minimum and the second is the maximum.
   */
  'slr:sizeRestriction'?: number | [number, number];
}

export class XliffDocumentBuilder {
  protected files: XliffFileBuilder[] = [];
  constructor(readonly srcLang = 'en-us') {}

  addFile(attributes: XliffFileAttributes): XliffFileBuilder {
    const file = new XliffFileBuilder(attributes);
    this.files.push(file);
    return file;
  }

  toString(): string {
    const filesAsXml = this.files
      .map((file) => file.toString())
      .filter((x) => !!x);
    assert(filesAsXml.length > 0, 'No files contained content.');
    return `<?xml version="1.0" encoding="UTF-8" ?>\n<xliff version="2.0" srcLang="${
      this.srcLang
    }" xmlns="urn:oasis:names:tc:xliff:document:2.0" xmlns:slr="urn:oasis:names:tc:xliff:sizerestriction:2.0">${filesAsXml.join(
      ' ',
    )}</xliff>`;
  }
}

export interface XliffFileAttributes extends XliffSizeRestrictionAttributes {
  id: string;
}
export class XliffFileBuilder {
  readonly notes = new XliffNotesBuilder();
  readonly content = new XliffContentBuilder();

  constructor(readonly attributes: XliffFileAttributes) {}

  addNote(...args: ConstructorParameters<typeof XliffNoteBuilder>): this {
    this.notes.add(...args);
    return this;
  }

  addGroup(
    ...args: ConstructorParameters<typeof XliffGroupBuilder>
  ): XliffGroupBuilder {
    return this.content.addGroup(...args);
  }

  addUnit(
    ...args: ConstructorParameters<typeof XliffUnitBuilder>
  ): XliffUnitBuilder {
    return this.content.addUnit(...args);
  }

  toString(): string {
    if (!this.content.length) {
      console.warn(`File ${this.attributes.id} has no content. Skipping.`);
      return '';
    }
    return `<file ${attributesToString(
      this.attributes,
    )}>\n${this.notes.toString()}${this.content.toString()}</file>`;
  }
}

export interface XliffNoteAttributes {
  id?: string;
  category?: string;
}
export class XliffNotesBuilder {
  protected notes: XliffNoteBuilder[] = [];

  add(...args: ConstructorParameters<typeof XliffNoteBuilder>): this {
    this.notes.push(new XliffNoteBuilder(...args));
    return this;
  }

  toString(): string {
    const notesAsXml = this.notes
      .map((note) => note.toString())
      .filter((x) => !!x);
    if (!notesAsXml.length) return '';
    return `<notes>${notesAsXml.join(' ')}</notes>`;
  }
}
export class XliffNoteBuilder {
  constructor(
    readonly text: string,
    readonly attributes: XliffNoteAttributes = {},
  ) {
    assert(text, 'Note text must be provided.');
  }

  toString(): string {
    return `<note ${attributesToString(this.attributes)}>${escapeXmlText(
      this.text,
    )}</note>`;
  }
}

export class XliffContentBuilder {
  readonly content: (XliffGroupBuilder | XliffUnitBuilder)[] = [];

  get length() {
    return this.content.length;
  }

  addGroup(
    ...args: ConstructorParameters<typeof XliffGroupBuilder>
  ): XliffGroupBuilder {
    const group = new XliffGroupBuilder(...args);
    this.content.push(group);
    return group;
  }

  addUnit(
    ...args: ConstructorParameters<typeof XliffUnitBuilder>
  ): XliffUnitBuilder {
    const unit = new XliffUnitBuilder(...args);
    this.content.push(unit);
    return unit;
  }

  toString(): string {
    const contentAsXml = this.content
      .map((content) => content.toString())
      .filter((x) => !!x);
    return contentAsXml.join(' ');
  }
}

export interface XliffGroupAttributes extends XliffSizeRestrictionAttributes {
  id: string;
  name?: string;
}
export class XliffGroupBuilder {
  readonly notes = new XliffNotesBuilder();
  readonly content = new XliffContentBuilder();
  constructor(readonly attributes: XliffGroupAttributes) {}

  addGroup(
    ...args: ConstructorParameters<typeof XliffGroupBuilder>
  ): XliffGroupBuilder {
    return this.content.addGroup(...args);
  }

  addUnit(
    ...args: ConstructorParameters<typeof XliffUnitBuilder>
  ): XliffUnitBuilder {
    return this.content.addUnit(...args);
  }

  toString() {
    return `<group ${attributesToString(
      this.attributes,
    )}>${this.notes.toString()}${this.content.toString()}</group>`;
  }
}

export interface XliffUnitAttributes extends XliffSizeRestrictionAttributes {
  id: string;
  name?: string;
}
export class XliffUnitBuilder {
  readonly notes = new XliffNotesBuilder();
  protected segments: XliffSegmentBuilder[] = [];

  constructor(
    readonly attributes: XliffUnitAttributes,
    /** If provided, a segment will be added to this unit with this text for translation. */
    text?: string,
  ) {
    if (text) this.addSegment(text);
  }

  addNote(...args: ConstructorParameters<typeof XliffNoteBuilder>): this {
    this.notes.add(...args);
    return this;
  }

  addSegment(...args: ConstructorParameters<typeof XliffSegmentBuilder>): this {
    const segment = new XliffSegmentBuilder(...args);
    this.segments.push(segment);
    return this;
  }

  toString(): string {
    if (!this.segments.length) {
      console.warn(`Unit ${this.attributes.id} has no segments. Skipping.`);
      return '';
    }
    return `<unit ${attributesToString(
      this.attributes,
    )}>${this.notes.toString()}${this.segments
      .map((segment) => segment.toString())
      .join('')}</unit>`;
  }
}

export interface XliffSegmentAttributes {
  id?: string;
}
export class XliffSegmentBuilder {
  constructor(
    readonly text: string,
    readonly attributes?: XliffSegmentAttributes,
  ) {}

  toString(): string {
    return `<segment ${attributesToString(
      this.attributes,
    )}><source>${escapeXmlText(this.text)}</source></segment>`;
  }
}
