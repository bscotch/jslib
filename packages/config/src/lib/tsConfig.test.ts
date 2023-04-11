import { Pathy } from '@bscotch/pathy';
import { TsConfig } from './tsConfig.js';
import { expect } from 'chai';

describe('TsConfig class', function () {
  it('can identify source files', async function () {
    const config = new TsConfig({ path: 'samples/tsconfig.base.json' });
    const sourceFiles = await config.sourceFiles();
    expect(sourceFiles.length).to.equal(1);
    expect(sourceFiles[0].equals('sample.ts')).to.be.true;
  });

  it('can check if a file is included', async function () {
    const config = new TsConfig({ path: 'samples/tsconfig.base.json' });
    expect(await config.includes('sample.ts')).to.exist;
    expect(await config.includes('sample.js')).to.be.undefined;
  });

  it('can check if an alias to a file is included', async function () {
    const config = new TsConfig({ path: 'samples/tsconfig.base.json' });
    expect(await config.includes('$lib/sample.ts')).to.exist;
    expect(await config.includes('$lib/sample.js')).to.be.undefined;
  });

  it('can check if a file is included in referenced projects', async function () {
    const config = new TsConfig({ path: 'samples/tsconfig.base.json' });
    expect(await config.includes('referenced/src/referencedSample.ts')).to.be
      .undefined;
    expect(
      await config.includes('referenced/src/referencedSample.ts', {
        searchProjectReferences: true,
      }),
    ).to.exist;
  });

  it('can check if an aliased file is included in referenced projects', async function () {
    const config = new TsConfig({ path: 'samples/tsconfig.base.json' });
    expect(await config.includes('$lib/referencedSample.ts')).to.be.undefined;
    expect(
      await config.includes('$lib/referencedSample.ts', {
        searchProjectReferences: true,
      }),
    ).to.exist;
  });
});
