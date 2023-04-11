import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import {
  findParentByFileSync,
  getModuleFilepath,
  listFilesByExtensionSync,
  listFilesSync,
  listFoldersSync,
  listPathsSync,
  removeEmptyDirsSync,
} from './files.js';

const sampleRoot = 'assets.test';
const sandboxRoot = 'assets.test.sandbox';

async function clearSandbox() {
  try {
    await fs.emptyDir(sandboxRoot);
  } catch (err) {
    console.log(err);
  }
}

async function populateSandbox() {
  await fs.ensureDir(sandboxRoot);
  await fs.copy(sampleRoot, sandboxRoot);
}

async function resetSandbox() {
  await clearSandbox();
  await populateSandbox();
}

function fullSamplePaths(relativeSamplePaths: string[]) {
  return relativeSamplePaths.map((p) => path.join(sampleRoot, p));
}

describe('Files', function () {
  before(async function () {
    await resetSandbox();
  });
  after(async function () {
    await clearSandbox();
  });

  it('can find package root', function () {
    const definiteInternalPath = getModuleFilepath(import.meta);
    const root = findParentByFileSync('package.json', definiteInternalPath);
    expect(path.basename(root)).to.equal('utility');
  });

  it('can list all paths in a directory', function () {
    const recursive = false;
    const expected = fullSamplePaths(['root-file.txt', 'subdir']);
    expect(
      listPathsSync(sampleRoot, recursive),
      'cannot list non-recursive',
    ).to.eql(expected);
  });

  it('can list all paths in a directory recursively', function () {
    const recursive = true;
    const expected = fullSamplePaths([
      'root-file.txt',
      'subdir',
      path.join('subdir', 'sub-file.json'),
      path.join('subdir', 'subsubdir'),
      path.join('subdir', 'subsubdir', 'sub-sub-file.md'),
    ]);
    expect(
      listPathsSync(sampleRoot, recursive),
      'cannot list recursive',
    ).to.eql(expected);
  });

  it('can list all files in a directory', function () {
    const recursive = false;
    const expected = fullSamplePaths(['root-file.txt']);
    expect(
      listFilesSync(sampleRoot, recursive),
      'cannot list non-recursive',
    ).to.eql(expected);
  });

  it('can list all files in a directory recursively', function () {
    const recursive = true;
    const expected = fullSamplePaths([
      'root-file.txt',
      path.join('subdir', 'sub-file.json'),
      path.join('subdir', 'subsubdir', 'sub-sub-file.md'),
    ]);
    expect(
      listFilesSync(sampleRoot, recursive),
      'cannot list recursive',
    ).to.eql(expected);
  });

  it('can list all dirs in a directory', function () {
    const recursive = false;
    const expected = fullSamplePaths(['subdir']);
    expect(
      listFoldersSync(sampleRoot, recursive),
      'cannot list non-recursive',
    ).to.eql(expected);
  });

  it('can list all dirs in a directory recursively', function () {
    const recursive = true;
    const expected = fullSamplePaths([
      'subdir',
      path.join('subdir', 'subsubdir'),
    ]);
    expect(
      listFoldersSync(sampleRoot, recursive),
      'cannot list recursive',
    ).to.eql(expected);
  });

  it('can list files in a directory by extension', function () {
    const recursive = false;
    const expected = fullSamplePaths(['root-file.txt']);
    expect(
      listFilesByExtensionSync(sampleRoot, 'txt', recursive),
      'cannot list non-recursive',
    ).to.eql(expected);
    expect(
      listFilesByExtensionSync(sampleRoot, 'md', recursive),
      'finds md files when it should not',
    ).to.eql([]);
  });

  it('can list all files in a directory by extension recursively', function () {
    const recursive = true;
    const expected = fullSamplePaths([
      path.join('subdir', 'sub-file.json'),
      path.join('subdir', 'subsubdir', 'sub-sub-file.md'),
    ]);
    expect(
      listFilesByExtensionSync(sampleRoot, ['json', 'md'], recursive),
      'cannot list recursive',
    ).to.eql(expected);
  });

  it('can recursively delete empty folders', async function () {
    await resetSandbox();
    fs.ensureDirSync(path.join(sandboxRoot, 'dir', 'subdir', 'subsubdir'));
    removeEmptyDirsSync(path.join(sandboxRoot, 'dir'));
    expect(fs.existsSync(path.join(sandboxRoot, 'dir'))).to.be.false;
  });
});
