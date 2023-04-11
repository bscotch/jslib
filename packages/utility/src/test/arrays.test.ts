import { expect } from 'chai';
import {
  arrayIsDecreasing,
  arrayIsIncreasing,
  arraySortNumeric,
  arraySortNumericDescending,
  arrayUnwrapped,
  arrayWrapped,
  findByField,
  findEntryAndIndexByField,
  findIndexByField,
  arrayWithoutNullish,
} from '../lib/array.js';

describe('Arrays', () => {
  it('can exclude nullish values', function () {
    expect(
      arrayWithoutNullish([1, null, 2, undefined, 0, false, '']),
    ).to.deep.equal([1, 2, 0, false, '']);
  });

  it('can tell if array values are increasing', () => {
    expect(arrayIsIncreasing([1, 2, 3, 4, 100, 99999])).to.be.true;
    expect(arrayIsIncreasing([-100, 9, 9.99])).to.be.true;
    expect(arrayIsIncreasing([1, 2, 3, 2, 6])).to.be.false;
  });
  it('can tell if array values are decreasing', () => {
    expect(arrayIsDecreasing([1, 2, 3, 4, 100, 99999])).to.be.false;
    expect(arrayIsDecreasing([1, 2, 3, 4, 100, 99999].reverse())).to.be.true;
  });
  it('can ensure a value is wrapped in an array', () => {
    expect(arrayWrapped(undefined)).to.eql([]);
    expect(arrayWrapped(['hello'])).to.eql(['hello']);
    expect(arrayWrapped('hello')).to.eql(['hello']);
  });
  it('can untouch an item (get first item if array, else return the value)', function () {
    expect(arrayUnwrapped(undefined)).to.be.undefined;
    expect(arrayUnwrapped([undefined])).to.be.undefined;
    expect(arrayUnwrapped([])).to.be.undefined;
    expect(arrayUnwrapped('hello')).to.eql('hello');
    expect(arrayUnwrapped(['hello', 'world'])).to.eql('hello');
  });
  it('can numerically sort arrays', function () {
    expect(arraySortNumeric([-100, 9.99, 9])).to.eql([-100, 9, 9.99]);
    expect(arraySortNumericDescending([-100, 9.99, 9])).to.eql([9.99, 9, -100]);
  });
  it('can find objects in an array by field', function () {
    const arr = [
      { id: 1, name: 'one' },
      { id: 2, name: 'two' },
      { id: 3, name: 'three' },
    ];
    expect(findByField(arr, 'id', 2)).to.eql({ id: 2, name: 'two' });
    expect(findByField(arr, 'name', 'two')).to.eql({ id: 2, name: 'two' });
    expect(findByField(arr, 'id', 4)).to.be.undefined;
    expect(findByField(arr, 'name', 'four')).to.be.undefined;

    expect(findIndexByField(arr, 'id', 2)).to.eql(1);
    expect(findIndexByField(arr, 'name', 'two')).to.eql(1);
    expect(findIndexByField(arr, 'id', 4)).to.equal(-1);
    expect(findIndexByField(arr, 'name', 'four')).to.equal(-1);

    expect(findEntryAndIndexByField(arr, 'id', 2)).to.eql([
      { id: 2, name: 'two' },
      1,
    ]);
    expect(findEntryAndIndexByField(arr, 'name', 'two')).to.eql([
      { id: 2, name: 'two' },
      1,
    ]);
    expect(findEntryAndIndexByField(arr, 'id', 4)).to.eql([undefined, -1]);
    expect(findEntryAndIndexByField(arr, 'name', 'four')).to.eql([
      undefined,
      -1,
    ]);
  });
});
