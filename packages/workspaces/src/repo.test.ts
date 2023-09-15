import { expect } from 'chai';
import path from 'path';
import { getRepoRoot, listGitLogs } from './repo.js';

describe('Workspace Repo', function () {
  it('can find the repo root', async function () {
    const root = await getRepoRoot('.');
    expect(path.basename(root)).to.equal('jslib');
  });

  it('can list all git logs', async function () {
    const logs = await listGitLogs('.');
    expect(logs.length).to.be.greaterThan(40);
    expect(logs[0].hash).to.be.a('string');
    expect(logs[0].author).to.be.an('object');
    expect(logs[0].author.name).to.be.a('string');
    expect(logs[0].author.email).to.be.a('string');
    expect(logs[0].date).to.be.an.instanceOf(Date);
    expect(logs[0].body).to.be.a('string');
    expect(logs[0].tags).to.be.an('array');
    expect(logs[0].affected).to.be.an('array');
  });
});
