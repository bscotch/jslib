import { expect } from 'chai';
import { deepEquals } from './deepEquals.js';

describe('deepEquals', function () {
  it('can correctly identify deep equality', function () {
    expect(deepEquals([1, [2, 3]], [1, [2, 3]])).to.be.true;
    expect(deepEquals([1, [2, 3], 4], [1, [2, 3]])).to.be.false;
    expect(deepEquals({ a: 2, b: 3 }, { a: 2, b: 3 })).to.be.true;
    expect(deepEquals({ a: 2, b: 3 }, { b: 3, a: 2 })).to.be.true;
    expect(deepEquals({ a: 2, b: 3, c: 4 }, { a: 2, b: 3 })).to.be.false;
    expect(deepEquals({ a: 2, b: 3 }, { a: 2, b: 3, c: 4 })).to.be.false;
    expect(deepEquals([1, [2, { a: 4 }], 4], [1, [2, { a: 4 }], 4])).to.be.true;
  });
});
