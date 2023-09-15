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
  });
});
