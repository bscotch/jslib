interface XliffExtraAttributes {
  [key: string]: unknown;
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

export type TextDirection = 'ltr' | 'rtl' | 'auto';
export type YesNo = 'yes' | 'no';
export type Priority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type State = 'initial' | 'translated' | 'reviewed' | 'final';

export interface XliffAttributes {
  srcLang?: string;
  trgLang?: string;
  version?: string;
  xmlns?: string;
  'xmlns:slr'?: string;
  [key: string]: unknown;
}

/**
 * See {@link https://docs.oasis-open.org/xliff/xliff-core/v2.0/xliff-core-v2.0.html#file the docs}
 */
export interface XliffFileAttributes
  extends XliffSizeRestrictionAttributes,
    XliffExtraAttributes {
  canResegment?: YesNo;
  id: string;
  original?: string;
  srcDir?: TextDirection;
  translate?: YesNo;
  trgDir?: TextDirection;
}

export interface XliffNoteAttributes extends XliffExtraAttributes {
  appliesTo?: string;
  category?: string;
  id?: string;
  priority?: Priority;
}

export interface XliffGroupAttributes
  extends XliffSizeRestrictionAttributes,
    XliffExtraAttributes {
  canResegment?: YesNo;
  id: string;
  name?: string;
  srcDir?: TextDirection;
  translate?: YesNo;
  trgDir?: TextDirection;
  type?: string;
}

export interface XliffUnitAttributes
  extends XliffSizeRestrictionAttributes,
    XliffExtraAttributes {
  canResegment?: YesNo;
  id: string;
  name?: string;
  srcDir?: TextDirection;
  translate?: YesNo;
  trgDir?: TextDirection;
  type?: string;
}

export interface XliffSegmentAttributes extends XliffExtraAttributes {
  id?: string;
  canResegment?: YesNo;
  state?: State;
  subState?: string;
}
