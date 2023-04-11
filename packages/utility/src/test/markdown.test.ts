import { expect } from 'chai';
import { markdownTableToObjects } from '../index.js';

const table = `
  | Name | Description | Value |
  | --- | --- | --- |
  | Adam | Does stuff | 10 |
  | Someone ELSE | Does stuff | 20 |
`;

describe('Files', function () {
  it('can create objects from a markdown file', function () {
    const asObjects = markdownTableToObjects(table, {
      transformColumnName(header, columnIndex) {
        return `${header.toUpperCase()}${columnIndex}`;
      },
      transformCellContent(cell, rowNumber, columnNumber, columnName) {
        if (columnName == 'VALUE2') {
          return +cell;
        }
        return `${cell.toLowerCase()}${rowNumber}${columnNumber}`;
      },
    });
    expect(asObjects).to.eql([
      {
        NAME0: 'adam00',
        DESCRIPTION1: 'does stuff01',
        VALUE2: 10,
      },
      {
        NAME0: 'someone else10',
        DESCRIPTION1: 'does stuff11',
        VALUE2: 20,
      },
    ]);
  });
});
