import { assert } from './types.js';

/**
 * Given a Markdown table with a header row,
 * return an array of row objects with fields matching
 * the column name from the header.
 */
export function markdownTableToObjects<Entry extends Record<string, any>>(
  table: string,
  options?: {
    /**
     * Optionally apply transformations to the column names
     * prior to using them as fields for the returned objects.
     */
    transformColumnName?: (
      columnContent: string,
      columnIndex?: number,
    ) => keyof Entry;
    /**
     * Optionally apply transformations to the cell contents
     * prior to using them as field values for the returned objects.
     *
     * (This will not be called on the header entries.)
     */
    transformCellContent?: (
      cellContent: string,
      rowIndex?: number,
      columnIndex?: number,
      columnName?: keyof Entry,
    ) => any;
  },
): Entry[] {
  const rowStrings = table.trim().split('\n');
  const rows = rowStrings.map((row) => {
    const columns = row.trim().split(/\s*\|\s*/);
    // First and last will be empty, so remove them
    columns.shift();
    columns.pop();
    return columns;
  });
  const headers = rows
    .shift()
    ?.map((header, headerIndex) =>
      options?.transformColumnName
        ? options.transformColumnName(header, headerIndex)
        : header,
    ) as (keyof Entry)[];
  assert(headers?.length, 'No headers found');

  const headerBreakRow = rows.shift()!;
  assert(
    headerBreakRow.every((col) => col.match(/^-+$/)),
    'Header break row is not all dashes',
  );

  const asObjects = rows.map((row, rowNumber) => {
    return headers.reduce((obj, header, columnNumber) => {
      if (typeof row[columnNumber] === 'undefined') {
        return obj;
      }
      const value = options?.transformCellContent
        ? options.transformCellContent(
            row[columnNumber],
            rowNumber,
            columnNumber,
            header,
          )
        : row[columnNumber];
      if (value === undefined) {
        return obj;
      }
      // @ts-ignore
      obj[header] = value;
      return obj;
    }, {} as Partial<Entry>);
  });

  return asObjects as Entry[];
}
