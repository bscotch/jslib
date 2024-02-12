import { assert, attributesToString, escapeXmlText } from './utility.js';
import type {
  XliffAttributes,
  XliffFileAttributes,
  XliffGroupAttributes,
  XliffNoteAttributes,
  XliffSegmentAttributes,
  XliffUnitAttributes,
} from './xliff.types.js';

export class XliffDocumentBuilder {
  protected files: XliffFileBuilder[] = [];
  public attributes: XliffAttributes = {};

  constructor(srcLang?: string);
  constructor(attributes?: XliffAttributes);
  constructor(attributes?: XliffAttributes | string) {
    this.attributes =
      typeof attributes === 'string'
        ? { srcLang: attributes }
        : { ...attributes } || {};
    this.attributes.srcLang ||= 'en-US';
  }

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
    return `<?xml version="1.0" encoding="UTF-8" ?>\n<xliff version="2.0"${attributesToString(
      this.attributes,
    )} xmlns="urn:oasis:names:tc:xliff:document:2.0" xmlns:slr="urn:oasis:names:tc:xliff:sizerestriction:2.0">${filesAsXml.join(
      ' ',
    )}</xliff>`;
  }
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
    return `<file${attributesToString(
      this.attributes,
    )}>\n${this.notes.toString()}${this.content.toString()}</file>`;
  }
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
    return `<note${attributesToString(this.attributes)}>${escapeXmlText(
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
    return `<group${attributesToString(
      this.attributes,
    )}>${this.notes.toString()}${this.content.toString()}</group>`;
  }
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
    return `<unit${attributesToString(
      this.attributes,
    )}>${this.notes.toString()}${this.segments
      .map((segment) => segment.toString())
      .join('')}</unit>`;
  }
}

export class XliffSegmentBuilder {
  #target?: string;
  constructor(
    readonly text: string,
    target?: string,
    readonly attributes?: XliffSegmentAttributes,
  ) {
    this.#target = target;
  }

  addTarget(text: string) {
    this.#target = text;
    return this;
  }

  toString(): string {
    return `<segment${attributesToString(
      this.attributes,
    )}><source>${escapeXmlText(this.text)}</source>${
      this.#target ? `<target>${escapeXmlText(this.#target)}</target>` : ''
    }</segment>`;
  }
}
