import { expect } from 'chai';
import {
  createDependencyGraph,
  listManifests,
  listRepoManifests,
} from './deps.js';

describe('Workspace Deps', function () {
  it('can list all workspace manifests', async function () {
    const packages = (await listManifests('../..')).map((p) => p.relativePath);
    expect(packages).to.contain('package.json');
    expect(packages).to.contain('packages/workspaces/package.json');
    // Don't want a fragile test here -- just want to make sure we're getting a bunch of packages back.
    expect(packages).to.have.length.greaterThan(5);
  });

  it('can get all manifest data', async function () {
    const packages = await listManifests('../..');
    expect(packages).to.have.length.greaterThan(5);
    expect(packages[0].relativePath).to.be.a('string');
    expect(packages[0].absolutePath).to.be.a('string');
    expect(packages[0].package).to.be.an('object');
    expect(packages[0].package.name).to.be.a('string');
  });

  it('can list all workspace manifests in the repo', async function () {
    const packages = await listManifests('../..');
    const repoPackages = await listRepoManifests('.');
    expect(packages.length).to.equal(repoPackages.length);
    for (let i = 0; i < packages.length; i++) {
      // `packages` are relative and `repoPackages` are absolute
      expect(repoPackages[i].absolutePath).to.be.a('string');
    }
  });

  it('can create a dependency graph', async function () {
    const packages = await listManifests('../..');
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

  it('can list all packages and their git logs', async function () {
    const packages = await listRepoManifests('.');
    expect(packages.length).to.be.greaterThan(5);
    for (const pkg of packages) {
      expect(pkg.package).to.be.an('object');
      expect(pkg.package.name).to.be.a('string');
      expect(pkg.logs).to.be.an('object');
      expect(pkg.logs.length).to.be.greaterThan(1);
    }
  });
});
