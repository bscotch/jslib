import { expect } from 'chai';
import { PackageName } from './packageName.js';

describe('PackageName class', function () {
  it('should be able to create a PackageName instance from a string', function () {
    const name = new PackageName('@bscotch/hello');
    expect(name.components.unscoped).to.equal('hello');
    expect(name.components.name).to.equal('@bscotch/hello');
    expect(name.components.scope).to.equal('bscotch');
    expect(name.components.version).to.be.undefined;
  });

  it('should be able to create a PackageName instance from a package.json object', function () {
    const name = new PackageName({ name: '@bscotch/hello', version: 'latest' });
    expect(name.components.unscoped).to.equal('hello');
    expect(name.components.name).to.equal('@bscotch/hello');
    expect(name.components.scope).to.equal('bscotch');
    expect(name.components.version).to.be.equal('latest');
  });

  it('should be able to create a PackageName instance from its components', function () {
    const name = new PackageName({
      name: '@bscotch/hello',
      scope: 'bscotch',
      unscoped: 'hello',
      version: 'latest',
    });
    expect(name.components.unscoped).to.equal('hello');
    expect(name.components.name).to.equal('@bscotch/hello');
    expect(name.components.scope).to.equal('bscotch');
    expect(name.components.version).to.be.equal('latest');
  });

  it('should fail to create a PackageName instance with incompatible components', function () {
    expect(
      () => new PackageName({ name: '@bscotch/hello', scope: '@invalid' }),
    ).to.throw(Error);
    expect(
      () => new PackageName({ name: '@bscotch/hello', unscoped: 'invalid' }),
    ).to.throw(Error);
    expect(
      () => new PackageName({ name: '@bscotch/hello', scope: '@invalid' }),
    ).to.throw(Error);
    expect(
      () => new PackageName({ name: 'hello', scope: '@bscotch' }),
    ).to.throw(Error);
  });

  it('should be able to create a PackageName instance with a version from a string', function () {
    const name = new PackageName('@bscotch/hello@latest');
    expect(name.components.unscoped).to.equal('hello');
    expect(name.components.name).to.equal('@bscotch/hello');
    expect(name.components.scope).to.equal('bscotch');
    expect(name.components.version).to.equal('latest');
  });

  it('should be able to create a PackageName instance without a scope from a string', function () {
    const name = new PackageName('hello');
    expect(name.components.unscoped).to.equal('hello');
    expect(name.components.name).to.equal('hello');
    expect(name.components.scope).to.be.undefined;
    expect(name.components.version).to.be.undefined;
  });

  it('should be able to test for equality', function () {
    const name = new PackageName('@bscotch/hello');
    const testCaseTypeCasts = [
      function asString(x: string) {
        return x;
      },
      function asInstance(x: string) {
        return new PackageName(x);
      },
      function asComponents(x: string) {
        return new PackageName(x).components;
      },
    ];
    for (const cast of testCaseTypeCasts) {
      expect(name.equals(cast('@bscotch/hello'))).to.be.true;
      expect(name.equals(cast('@bscotch/hello@latest'))).to.be.true;
      expect(
        name.equals(cast('@bscotch/hello@latest'), { allowMissingScope: true }),
        'should match if scope provided but not required',
      ).to.be.true;
      expect(
        name.equals(cast('@bscotch/hello@latest'), { includeVersion: true }),
        'should not match if version required but not set on instance',
      ).to.be.false;

      expect(name.equals(cast('hello'))).to.be.false;
      expect(name.equals(cast('hello@latest'))).to.be.false;

      expect(name.equals(cast('hello@latest'), { allowMissingScope: true })).to
        .be.true;
      expect(
        name.equals(cast('hello@latest'), {
          allowMissingScope: true,
          includeVersion: true,
        }),
      ).to.be.false;
    }
  });

  it('should be able to test for equality with a regex', function () {
    const names = [
      {
        name: new PackageName('@bscotch/hello@latest'),
        scoped: true,
      },
      {
        name: new PackageName('hello@latest'),
        scoped: false,
      },
    ];

    for (const { name, scoped } of names) {
      for (const allowMissingScope of [true, false]) {
        /**
         * The unscoped name will not match any regexes
         * that include the scope in the prefix.
         */
        const unscopedOverride = (expected: boolean) =>
          scoped ? expected : false;

        //#region scoped regexes
        // Scoped regexes should always give the same
        // results regardless of whether the `allowMissingScope` option

        // Tests default to excluding the version
        expect(name.equals(/@bscotch\/hello/, { allowMissingScope })).to.equal(
          unscopedOverride(true),
        );
        expect(
          name.equals(/^@bscotch\/hello$/, { allowMissingScope }),
        ).to.equal(unscopedOverride(true));
        expect(
          name.equals(/^@bscotch\/hello@latest/, { allowMissingScope }),
        ).to.equal(unscopedOverride(false));

        // Including the version yields different results
        expect(
          name.equals(/^@bscotch\/hello@latest/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(unscopedOverride(true));
        expect(
          name.equals(/^@bscotch\/hello$/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(unscopedOverride(false));
        expect(
          name.equals(/^@bscotch\/hello@latest$/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(unscopedOverride(true));

        //#endregion

        //#region unscoped regexes
        expect(name.equals(/hello/, { allowMissingScope })).to.equal(true);
        expect(name.equals(/^hello$/, { allowMissingScope })).to.equal(
          scoped ? allowMissingScope : true,
        );
        expect(name.equals(/^hello@latest/, { allowMissingScope })).to.equal(
          false,
        );
        expect(
          name.equals(/^hello@latest/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(scoped ? allowMissingScope : true);
        expect(
          name.equals(/^hello@latest$/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(scoped ? allowMissingScope : true);
        expect(
          name.equals(/^hello$/, {
            includeVersion: true,
            allowMissingScope,
          }),
        ).to.equal(false);
        //#endregion
      }
    }
  });
});
