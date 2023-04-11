import { expect } from 'chai';
import { z } from 'zod';
import { Pathy } from './pathy.js';
import { PathyStatic } from './pathy.static.js';

const tempPath = new Pathy('tmp');
await tempPath.ensureDirectory();

type Content = z.infer<typeof contentSchema>;
const contentSchema = z.object({ hello: z.literal('world') }).strict();
const exts = ['json', 'json5', 'jsonc', 'yaml', 'yml'];

describe('Pathy', function () {
  it('can normalize paths', function () {
    expect(PathyStatic.normalize('a/b/c//../d/')).to.equal('a/b/d');
    expect(PathyStatic.normalize('/a/b/.//c//../d//')).to.equal('/a/b/d');
    expect(PathyStatic.normalize('file:///a/b/c/d/%20space')).to.equal(
      '/a/b/c/d/ space',
    );
    expect(PathyStatic.normalize('C://a/b/.//c//../d//')).to.equal('c:/a/b/d');
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
