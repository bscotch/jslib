import { expect } from 'chai';
import { jsonStringify } from './stringify.json.js';

describe('stringify', () => {
  it('can json stringify', function () {
    const value = {
      a: 1,
      b: 2,
      c: 3,
      d: undefined,
      e: null,
      f: [0, 1, 2, 'a', { nested: ['array', 'values'] }],
    };
    expect(jsonStringify(value)).to.equal(JSON.stringify(value));
    expect(
      jsonStringify(value, { spaces: 2, excludeFinalNewline: true }),
    ).to.equal(JSON.stringify(value, null, 2));
  });
});
