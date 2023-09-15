import { expect } from 'chai';
import {
  createDependencyGraph,
  getRepoRoot,
  listManifests,
  listRepoManifests,
} from './deps.js';
import path from 'node:path';

describe('Workspaces', function () {
  it('can list all workspace manifests', async function () {
    const packages = await listManifests('../..');
    expect(packages).to.contain('package.json');
    expect(packages).to.contain('packages/workspaces/package.json');
    // Don't want a fragile test here -- just want to make sure we're getting a bunch of packages back.
    expect(packages).to.have.length.greaterThan(5);
  });

  it('can get all manifest data', async function () {
    const packages = await listManifests('../..', { objectMode: true });
    expect(packages).to.have.length.greaterThan(5);
    expect(packages[0].path).to.be.a('string');
    expect(packages[0].package).to.be.an('object');
    expect(packages[0].package.name).to.be.a('string');
  });

  it('can find the repo root', async function () {
    const root = await getRepoRoot('.');
    expect(path.basename(root)).to.equal('jslib');
  });

  it('can list all workspace manifests in the repo', async function () {
    const packages = await listManifests('../..');
    const repoPackages = await listRepoManifests('.');
    expect(packages.length).to.equal(repoPackages.length);
    for (let i = 0; i < packages.length; i++) {
      // `packages` are relative and `repoPackages` are absolute
      expect(repoPackages[i].replace(/\\/g, '/').endsWith(packages[i])).to.be
        .true;
    }
  });

  it('can create a dependency graph', async function () {
    const packages = await listManifests('../..', { objectMode: true });
    const graph = createDependencyGraph(packages, {
      excludeProtocols: ['semver'],
    });
    expect(graph.size()).to.be.greaterThan(5);

    // Check a known dependency relationship
    const dependants = graph.dependantsOf('@bscotch/utility');
    expect(
      ['@bscotch/pathy', '@bscotch/trebuchet'].every((d) =>
        dependants.includes(d),
      ),
    ).to.be.true;
  });
});
