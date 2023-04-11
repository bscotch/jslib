import { expect } from 'chai';
import { parentPaths, sortedPaths, toPosixPath } from '../lib/paths.js';

describe('Paths', function () {
  it('can sort paths by directory', function () {
    const pathList = [
      'hello/world',
      'hello',
      'h/another',
      'hello/world/goodbye',
    ];
    const expectedOrder = [
      'hello',
      'h/another',
      'hello/world',
      'hello/world/goodbye',
    ];
    const sorted = sortedPaths(pathList);
    expect(sorted).to.eql(expectedOrder);
  });

  it('can generate all paths leading up to a target path', function () {
    const targetPath = '/hello/world/foo/bar.txt';
    const expectedPaths = [
      '/',
      '/hello',
      '/hello/world',
      '/hello/world/foo',
      '/hello/world/foo/bar.txt',
    ];
    expect(parentPaths(targetPath)).to.eql(expectedPaths);
  });

  it('can convert paths to posix', function () {
    expect(toPosixPath('C:\\hello')).to.equal('/c/hello');
    expect(toPosixPath('/HELLO/world')).to.equal('/HELLO/world');
    expect(toPosixPath('hello\\world\\')).to.equal('hello/world/');
  });
});
