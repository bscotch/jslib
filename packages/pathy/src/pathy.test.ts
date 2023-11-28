import { expect } from 'chai';
import { z } from 'zod';
import { rmSafe, statSafe } from './fsSafe.js';
import { Pathy } from './pathy.js';
import { PathyStatic } from './pathy.static.js';
import { pathy } from './index.js';

const tempPath = new Pathy('tmp');
await tempPath.ensureDirectory();

type Content = z.infer<typeof contentSchema>;
const contentSchema = z.object({ hello: z.literal('world') }).strict();
const exts = ['json', 'json5', 'jsonc', 'yaml', 'yml'];

async function assertThrows(fn: Function, message: string) {
  try {
    await fn();
  } catch {
    return;
  }
  throw new Error(message);
}

describe('Pathy', function () {
  // NOTE: This test is for a Windows issue that is hard to create
  // a test for, so this assume some stuff about the local environment.
  // Should be skipped on CI and in general!
  xit('can skip a path on error', async function () {
    const path = pathy(process.env.PROGRAMFILES);
    await path.exists({ assert: true });
    assertThrows(
      async () =>
        await path.listChildrenRecursively({
          onError: 'throw',
          maxDepth: 1,
        }),
      `Should have thrown`,
    );
    const paths = await path.listChildrenRecursively({
      onError: 'skip',
      maxDepth: 1,
    });
    expect(paths.length).to.be.greaterThan(10);
  });

  it('can errors when statting a missing file', async function () {
    const path = new Pathy('missing');
    assertThrows(async () => {
      await statSafe(path);
    }, `Failed to stat file "${path.toString()}"`);
  });

  it('can "remove" missing paths without error', async function () {
    const path = new Pathy('missing');
    await rmSafe(path);
  });

  it('can normalize paths', function () {
    expect(PathyStatic.normalize('a/b/c//../d/')).to.equal('a/b/d');
    expect(PathyStatic.normalize('/a/b/.//c//../d//')).to.equal('/a/b/d');
    expect(PathyStatic.normalize('file:///a/b/c/d/%20space')).to.equal(
      '/a/b/c/d/ space',
    );
    expect(PathyStatic.normalize('C://a/b/.//c//../d//')).to.equal('c:/a/b/d');
  });

  it('can add a validator', function () {
    const p = new Pathy('a/b/c').withValidator(z.string());
    expect(p.validator).to.exist;
  });

  it('can identify root paths', function () {
    expect(new Pathy('/').isRoot).to.be.true;
    expect(new Pathy('c:/').isRoot).to.be.true;
    expect(new Pathy('c:/hello').isRoot).to.be.false;
    expect(new Pathy('c:\\').isRoot).to.be.true;
    expect(new Pathy('').isRoot).to.be.false;
    expect(new Pathy('/a/b').isRoot).to.be.false;
    expect(new Pathy('a').isRoot).to.be.false;
  });

  it('can explode paths', function () {
    expect(PathyStatic.explode('a/b/c//../d/')).to.eql(['', 'a', 'b', 'd']);
    expect(PathyStatic.explode('/a/b/c//../d/')).to.eql(['/', 'a', 'b', 'd']);
  });

  it('can tell if a path is a parent of another', function () {
    expect(PathyStatic.isParentOf('a/b/c', 'a/b/c/d/e')).to.be.true;
    expect(PathyStatic.isParentOf('a/b/c', 'a/b/c')).to.be.true;
    expect(PathyStatic.isParentOf('a/b/c', 'a/b/c/d')).to.be.true;
    expect(PathyStatic.isParentOf('a/b/c', 'a/b/d')).to.be.false;
    expect(PathyStatic.isParentOf('a/b/c', 'a/b')).to.be.false;
    expect(PathyStatic.isParentOf('a/b/c', 'a')).to.be.false;
  });

  it('reads/writes in a queue', async function () {
    const path = tempPath.join('queue.json');
    const waits: Promise<void | (Content & { i: number })>[] = [];
    for (let i = 0; i < 10; i++) {
      const content = { hello: 'world', i };
      const schema = contentSchema.extend({ i: z.literal(i) });
      void path.write(content);
      waits.push(path.read().then((x) => schema.parse(x)));
      void path.write(content, { schema });
      waits.push(path.read({ schema }));
    }
    await Promise.all(waits);
  });

  it('can correctly parse json-compatible files by type on read', async function () {
    const waits: Promise<Content>[] = [];
    for (const ext of exts) {
      waits.push(PathyStatic.read(`samples/sample.${ext}`));
      waits.push(
        PathyStatic.read(`samples/sample.${ext}`, {
          schema: contentSchema,
        }),
      );
    }
    const results = await Promise.all(waits);
    for (const result of results) {
      expect(result).to.eql({ hello: 'world' });
    }
  });
});
