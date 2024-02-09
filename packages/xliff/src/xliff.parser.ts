import { XMLParser } from 'fast-xml-parser';
import { assert } from './utility.js';
import {
  XliffAttributes,
  XliffFileAttributes,
  XliffGroupAttributes,
  XliffNoteAttributes,
  XliffSegmentAttributes,
  XliffUnitAttributes,
} from './xliff.types.js';

const attributeNamePrefix = '@_';
const parser = new XMLParser({
  ignoreAttributes: false,
  isArray(tag) {
    if (['xliff', 'notes', 'source', 'target'].includes(tag)) return false;
    return true;
  },
  attributeNamePrefix,
  alwaysCreateTextNode: true,
});

export interface ParsedXliff extends XliffAttributes {
  files: ParsedXliffFile[];
}
export interface ParsedXliffFile extends XliffFileAttributes {
  notes: ParsedXliffNote[];
  groups: ParsedXliffGroup[];
  units: ParsedXliffUnit[];
}
export interface ParsedXliffNote extends XliffNoteAttributes {
  note: string;
}
export interface ParsedXliffGroup extends XliffGroupAttributes {
  notes: ParsedXliffNote[];
  groups: ParsedXliffGroup[];
  units: ParsedXliffUnit[];
}
export interface ParsedXliffUnit extends XliffUnitAttributes {
  notes: ParsedXliffNote[];
  segments: ParsedXliffSegment[];
}
export interface ParsedXliffSegment extends XliffSegmentAttributes {
  source: string;
  target?: string;
}

export function parseXliff(xliff: string) {
  const parsed = parser.parse(xliff, {}).xliff;
  assert(parsed, 'No XLIFF content found');
  const xliffAttrs = getAttributes(parsed);
  const processed: ParsedXliff = { ...xliffAttrs, files: [] };
  // Root-level should be a bunch of files
  assert(
    Array.isArray(parsed.file) && parsed.file.length > 0,
    'No files found in XLIFF',
  );
  for (const file of parsed.file) {
    processed.files.push(parseXliffFile(file));
  }
  return processed;
}

function parseXliffFile(file: Record<string, any>): ParsedXliffFile {
  const fileAttrs = getAttributes(file) as XliffFileAttributes;
  assert(fileAttrs.id, 'File is missing an ID');
  // We only care about:
  // - ✅ "notes"
  // - "unit"
  // - "group"
  const parsedFile: ParsedXliffFile = {
    ...fileAttrs,
    notes: [],
    groups: [],
    units: [],
  };
  parsedFile.notes.push(...parseXliffNotes(file));
  parsedFile.units.push(...parseXliffUnits(file));
  parsedFile.groups.push(...parseXliffGroups(file));

  return parsedFile;
}

function parseXliffGroups(file: {
  group?: Record<string, any>[];
}): ParsedXliffGroup[] {
  const parsedGroups: ParsedXliffGroup[] = [];
  for (const group of file.group || []) {
    parsedGroups.push(parseXliffGroup(group));
  }
  return parsedGroups;
}

function parseXliffGroup(group: Record<string, any>): ParsedXliffGroup {
  const parsedGroup: ParsedXliffGroup = {
    ...(getAttributes(group) as XliffGroupAttributes),
    notes: parseXliffNotes(group),
    groups: parseXliffGroups(group),
    units: parseXliffUnits(group),
  };
  return parsedGroup;
}

function parseXliffUnits(units: {
  unit?: Record<string, any>[];
}): ParsedXliffUnit[] {
  const parsedUnits: ParsedXliffUnit[] = [];
  for (const unit of units.unit || []) {
    parsedUnits.push(parseXliffUnit(unit));
  }
  return parsedUnits;
}

function parseXliffUnit(unit: Record<string, any>): ParsedXliffUnit {
  const parsedUnit: ParsedXliffUnit = {
    ...(getAttributes(unit) as XliffUnitAttributes),
    notes: parseXliffNotes(unit),
    segments: parseXliffSegments(unit),
  };
  return parsedUnit;
}

function parseXliffSegments(unit: {
  segment?: Record<string, any>[];
}): ParsedXliffSegment[] {
  const parsedSegments: ParsedXliffSegment[] = [];
  for (const segment of unit.segment || []) {
    parsedSegments.push(parseXliffSegment(segment));
  }
  return parsedSegments;
}

function parseXliffSegment(segment: Record<string, any>): ParsedXliffSegment {
  return {
    ...(getAttributes(segment) as XliffSegmentAttributes),
    source: segment.source?.['#text'] || '',
    target: segment.target?.['#text'],
  };
}

function parseXliffNotes(notes: {
  notes?: { note?: Record<string, any>[] };
}): ParsedXliffNote[] {
  const parsedNotes: ParsedXliffNote[] = [];
  for (const note of notes.notes?.note || []) {
    parsedNotes.push(parseXliffNote(note));
  }
  return parsedNotes;
}

function parseXliffNote(note: Record<string, any>): ParsedXliffNote {
  const parsedNote: ParsedXliffNote = {
    ...getAttributes(note),
    note: note['#text'] || '',
  };
  return parsedNote;
}

function getAttributes(node: Record<string, string>): Record<string, string> {
  return Object.keys(node).reduce(
    (acc, key) => {
      if (key.startsWith(attributeNamePrefix)) {
        let value = node[key];
        if (Array.isArray(value)) {
          value = value[0];
        }
        acc[key.slice(attributeNamePrefix.length)] = value;
      }
      return acc;
    },
    {} as Record<string, string>,
  );
}
