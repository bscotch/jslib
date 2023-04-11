import { expect } from 'chai';
import {
  deleteJsonPointerValue,
  getJsonPointerValue,
  pointable,
  setJsonPointerValue,
} from './jsonPointer.js';

describe('JSON Pointer', function () {
  it('can get values using JSON Pointer strings', function () {
    expect(getJsonPointerValue({ a: 1, b: [10] }, '')).to.eql({
      a: 1,
      b: [10],
    });
    expect(getJsonPointerValue({ a: 1, b: [10] }, '/a')).to.equal(1);
    expect(getJsonPointerValue({ a: 1, b: [10] }, '/b')).to.eql([10]);
    expect(getJsonPointerValue({ a: 1, b: [10] }, '/b/0')).to.equal(10);
    expect(getJsonPointerValue({ a: 1, b: [10] }, '/b/1')).to.equal(undefined);
    expect(getJsonPointerValue({ a: 1, b: [10] }, '/b/-')).to.be.undefined;
  });
  it('can get values using JSON Pointer arrays', function () {
    expect(getJsonPointerValue({ a: 1, b: [10] }, [])).to.eql({
      a: 1,
      b: [10],
    });
    expect(getJsonPointerValue({ a: 1, b: [10] }, ['a'])).to.equal(1);
    expect(getJsonPointerValue({ a: 1, b: [10] }, ['b'])).to.eql([10]);
    expect(getJsonPointerValue({ a: 1, b: [10] }, ['b', 0])).to.equal(10);
    expect(getJsonPointerValue({ a: 1, b: [10] }, ['b', 1])).to.equal(
      undefined,
    );
    expect(getJsonPointerValue({ a: 1, b: [10] }, ['b', -1])).to.be.undefined;
  });

  it('can set values using JSON Pointer strings', function () {
    expect(() => setJsonPointerValue(undefined as any, '/hello', 1)).to.throw();
    expect(() => setJsonPointerValue({} as any, '', {})).to.throw();
    expect(() =>
      setJsonPointerValue({ b: [] } as any, '/b/whoops', 1),
    ).to.throw();

    const sample = { a: 1, b: [1] };

    expect(setJsonPointerValue(sample, '/b', [10])).to.eql([10]);
    expect(sample.b).to.eql([10]);

    expect(setJsonPointerValue(sample, '/a', 2)).to.equal(2);
    expect(sample.a).to.equal(2);

    expect(setJsonPointerValue(sample, '/b/0', 20)).to.equal(20);
    expect(sample.b[0]).to.equal(20);

    expect(setJsonPointerValue(sample, '/b/1', 30)).to.equal(30);
    expect(sample.b[1]).to.equal(30);

    expect(
      setJsonPointerValue(sample, '/b/1', 100, { noClobber: true }),
    ).to.equal(30);
    expect(sample.b[1]).to.equal(30);

    expect(setJsonPointerValue(sample, '/b/-', 40)).to.equal(40);
    expect(sample.b[2]).to.equal(40);

    expect(setJsonPointerValue(sample, '/c' as any, 50 as any)).to.equal(50);
    expect((sample as any).c).to.equal(50);

    // Ensure missing intermediate objects are handled properly
    // @ts-expect-error Can normally only delete optional props
    delete sample.b;
    expect(() => setJsonPointerValue(sample, '/b/0', 100)).to.throw();
    expect(
      setJsonPointerValue(sample, '/b/0', 100, { createMissing: true }),
    ).to.equal(100);
    expect(sample.b[0]).to.equal(100);
  });

  it('can set values using JSON Pointer arrays', function () {
    expect(() =>
      setJsonPointerValue(undefined as any, ['hello'], 1),
    ).to.throw();
    expect(() => setJsonPointerValue({} as any, [], {})).to.throw();
    expect(() =>
      setJsonPointerValue({ b: [] } as any, ['b', 'whoops'], 1),
    ).to.throw();

    const sample = { a: 1, b: [10] };

    expect(pointable(sample).at(['a']).set(2)).to.equal(2);
    expect(sample.a).to.equal(2);

    expect(pointable(sample).at(['b', 0]).set(20)).to.equal(20);
    expect(sample.b[0]).to.equal(20);

    expect(pointable(sample).at(['b', 1]).set(30)).to.equal(30);
    expect(sample.b[1]).to.equal(30);

    expect(
      pointable(sample).at(['b', 1]).set(100, { noClobber: true }),
    ).to.equal(30);
    expect(sample.b[1]).to.equal(30);

    expect(pointable(sample).at(['b', '-']).set(40)).to.equal(40);
    expect(sample.b[2]).to.equal(40);

    expect(
      pointable(sample as any)
        .at(['c'])
        .set(50),
    ).to.equal(50);
    expect((sample as any).c).to.equal(50);

    // Ensure missing intermediate objects are handled properly
    // @ts-expect-error Can normally only delete optional props
    delete sample.b;
    expect(() => pointable(sample).at(['b', 0]).set(100)).to.throw();
    expect(
      pointable(sample).at(['b', 0]).set(100, { createMissing: true }),
    ).to.equal(100);
    expect(sample.b[0]).to.equal(100);
  });

  it('can delete values using JSON Pointer strings', function () {
    const newSample = () => ({ a: 1, b: [10] });
    expect(() => deleteJsonPointerValue(newSample(), '')).to.throw();
    let sample = newSample();
    expect(deleteJsonPointerValue(sample, '/a')).to.equal(1);
    expect(sample).to.eql({ b: [10] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, '/b')).to.eql([10]);
    expect(sample).to.eql({ a: 1 });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, '/b/0')).to.equal(10);
    expect(sample).to.eql({ a: 1, b: [] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, '/b/1')).to.equal(undefined);
    expect(sample).to.eql({ a: 1, b: [10] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, '/b/-')).to.be.undefined;
    expect(sample).to.eql({ a: 1, b: [10] });
  });

  it('can delete values using JSON Pointer arrays', function () {
    const newSample = () => ({ a: 1, b: [10] });
    expect(() => deleteJsonPointerValue(newSample(), [])).to.throw();

    let sample = newSample();
    expect(deleteJsonPointerValue(sample, ['a'])).to.equal(1);
    expect(sample).to.eql({ b: [10] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, ['b'])).to.eql([10]);
    expect(sample).to.eql({ a: 1 });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, ['b', 0])).to.equal(10);
    expect(sample).to.eql({ a: 1, b: [] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, ['b', 1])).to.equal(undefined);
    expect(sample).to.eql({ a: 1, b: [10] });

    sample = newSample();
    expect(deleteJsonPointerValue(sample, ['b', -1])).to.be.undefined;
    expect(sample).to.eql({ a: 1, b: [10] });
  });
});
