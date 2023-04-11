import { expect } from 'chai';
import {
  arrayToObject,
  flattenObjectPaths,
  getValueAtPath,
  invert,
  KeySortRef,
  objectPathsFromWildcardPath,
  setValueAtPath,
  sortKeysByReference,
  transformValueByPath,
  listPublicAsyncMethods,
} from './objects.js';

describe('Objects', function () {
  const createTestObject = () => {
    return {
      hello: 'world',
      nested: {
        layer: 1,
        array: [4, 6, 7],
      },
    };
  };

  const createDeepTestObject = () => {
    return {
      sequence: {
        tracks: [
          {
            keyframes: {
              Keyframes: [
                {
                  Key: 0,
                  Length: 1,
                },
                {
                  Key: 1,
                  Length: 1,
                },
              ],
            },
          },
        ],
      },
    };
  };

  it('can can sort one object using another as a reference', function () {
    expect(sortKeysByReference('hello', 'world')).to.equal('hello');
    const unsorted = {
      lastKey: [
        {
          extraField: 'extra',
          name: 'first',
          id: 0,
        },
        'totally not an object',
        {
          name: 'second',
          id: 1,
        },
      ],
      firstKey: ['something'],
      bonusKey: 'bonus',
      middleKey: {
        deeply: { nested: { b: 1, c: 2, a: 0 } },
        firstly: 0,
      },
      secondBonus: 'second bonus',
    };
    const reference: KeySortRef<typeof unsorted> = {
      firstKey: true,
      middleKey: {
        extraExampleKey: 'should not appear',
        firstly: 0,
        deeply: { nested: { a: 0, b: 1, c: 2 } },
      },
      lastKey: [
        {
          id: 'HMMM',
          name: 'first',
        },
        'Bad sort ref',
      ],
    };
    const expectedAfterSort = {
      firstKey: ['something'],
      middleKey: {
        firstly: 0,
        deeply: { nested: { a: 0, b: 1, c: 2 } },
      },
      lastKey: [
        {
          id: 0,
          name: 'first',
          extraField: 'extra',
        },
        'totally not an object',
        {
          id: 1,
          name: 'second',
        },
      ],
      bonusKey: 'bonus',
      secondBonus: 'second bonus',
    };
    const sorted = sortKeysByReference(unsorted, reference);
    // Key order does not impact deep equality
    expect(sorted, 'sorted should still deeply equal the original').to.eql(
      unsorted,
    );
    // Before taking key order into account, the sorted object should match the expected object
    expect(sorted, 'sorted should match the expected object').to.eql(
      expectedAfterSort,
    );
    // stringify to check order
    expect(
      JSON.stringify(sorted),
      'sorted should match the expected object',
    ).to.equal(JSON.stringify(expectedAfterSort));
  });

  it('can create a map from an array', function () {
    expect(arrayToObject(['hello', 'world'])).to.eql({
      '0': 'hello',
      '1': 'world',
    });
    expect(arrayToObject(['root', ['nested']])).to.eql({
      '0': 'root',
      '1': ['nested'],
    });
  });

  it('can flatten nested data structures', function () {
    expect(flattenObjectPaths(createTestObject())).to.eql({
      hello: 'world',
      'nested.layer': 1,
      'nested.array.0': 4,
      'nested.array.1': 6,
      'nested.array.2': 7,
    });
    expect(flattenObjectPaths(createDeepTestObject())).to.eql({
      'sequence.tracks.0.keyframes.Keyframes.0.Key': 0,
      'sequence.tracks.0.keyframes.Keyframes.0.Length': 1,
      'sequence.tracks.0.keyframes.Keyframes.1.Key': 1,
      'sequence.tracks.0.keyframes.Keyframes.1.Length': 1,
    });
  });

  it('can invert an object', function () {
    expect(invert({ hello: 'world', ten: 10 })).to.eql({
      10: 'ten',
      world: 'hello',
    });
  });

  it('can get values using paths', function () {
    const object = createTestObject();
    expect(getValueAtPath(object, 'hello')).to.equal('world');
    expect(getValueAtPath(object, 'hello.invalid')).to.be.undefined;
    expect(getValueAtPath(object, 'nested.array.3')).to.be.undefined;
    expect(getValueAtPath(object, 'nested.array.2')).to.equal(7);

    const deepObject = createDeepTestObject();
    expect(
      getValueAtPath(deepObject, 'sequence.tracks.0.keyframes.Keyframes.1.Key'),
    ).to.equal(1);
  });

  it('can set values using paths', function () {
    const object = createTestObject();
    setValueAtPath(object, 'hello', 'goodbye');
    expect(object.hello).to.equal('goodbye');
    setValueAtPath(object, 'nested.array.1', 5);
    expect(object.nested.array[1]).to.equal(5);
    setValueAtPath(object, 'nested.array.4', 3);
    expect(object.nested.array).to.eql([4, 5, 7, undefined, 3]);
    setValueAtPath(object, 'new.0.hello.world', 'weee');
    expect((object as any).new[0].hello.world).to.eql('weee');

    const deepObject = createDeepTestObject();
    const deepKey = 'sequence.tracks.0.keyframes.Keyframes.0.Key';
    setValueAtPath(deepObject, deepKey, 2);
    expect(getValueAtPath(deepObject, deepKey)).to.eql(2);
  });

  it('can convert a wildcard path into all matching paths', function () {
    const object = createTestObject();
    expect(objectPathsFromWildcardPath('*', object)).to.eql([
      'hello',
      'nested',
    ]);
    expect(objectPathsFromWildcardPath('*.*', object)).to.eql([
      'nested.layer',
      'nested.array',
    ]);
    expect(objectPathsFromWildcardPath('nested.*', object)).to.eql([
      'nested.layer',
      'nested.array',
    ]);
    expect(objectPathsFromWildcardPath('nested.array.*', object)).to.eql([
      'nested.array.0',
      'nested.array.1',
      'nested.array.2',
    ]);

    const deepObject = createDeepTestObject();
    expect(objectPathsFromWildcardPath('*', deepObject)).to.eql(['sequence']);
    expect(
      objectPathsFromWildcardPath(
        'sequence.tracks.*.keyframes.Keyframes.*.Key',
        deepObject,
      ),
    ).to.eql([
      'sequence.tracks.0.keyframes.Keyframes.0.Key',
      'sequence.tracks.0.keyframes.Keyframes.1.Key',
    ]);
    expect(
      objectPathsFromWildcardPath(
        'sequence.tracks.*.keyframes.Keyframes.1.Key',
        deepObject,
      ),
    ).to.eql(['sequence.tracks.0.keyframes.Keyframes.1.Key']);
  });

  it('can transform paths with wildcards', function () {
    const object = createTestObject();
    transformValueByPath(object, 'nested.layer', (n: number) => ++n);
    transformValueByPath(object, 'nested.array.0', (n: number) => ++n);
    transformValueByPath(object, 'nested.array.*', (n: number) => ++n);
    expect(object.nested.layer).to.eql(2);
    expect(object.nested.array).to.eql([6, 7, 8]);
    // Transforming a missing field should cause nothing to happen
    transformValueByPath(object, 'nested.array.3', (n: number) => ++n);
    expect(object.nested.array).to.eql([6, 7, 8]);
    // Should also be able to apply transforms to all fiels of an object.
    transformValueByPath(object, 'nested.*', () => 9);
    expect(object.nested).to.eql({ layer: 9, array: 9 });
  });

  it('can list all public methods on an object', async function () {
    const out = Promise.resolve('yes');

    class A {
      no = 'way';
      probably = async () => await out;
      get nope() {
        return 'nope';
      }
      nah() {
        return 'nope';
      }
      async yes() {
        return await out;
      }
      async #betterNot() {
        return await 'NOPE';
      }
    }

    class B extends A {
      async #stillBetterNot() {
        return await 'NOPE';
      }
      async sure() {
        return await out;
      }
    }

    const cases = [
      {
        obj: {
          no: 'way',
          get nope() {
            return 'nope';
          },
          nah() {
            return 'nope';
          },
          async yes() {
            return await out;
          },
          probably: async () => await out,
        },
        expected: ['yes', 'probably'],
      },
      {
        obj: new A(),
        expected: ['probably', 'yes'],
      },
      {
        obj: new B(),
        expected: ['probably', 'yes', 'sure'],
      },
    ];

    for (const { obj, expected } of cases) {
      const actual = listPublicAsyncMethods(obj);
      expect(actual.sort()).to.eql(expected.sort());
      for (const key of actual) {
        expect(obj[key]).to.be.a('function');
        expect(await obj[key]()).to.equal(await out);
      }
    }
  });
});
