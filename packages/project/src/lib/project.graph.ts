import { DepGraph } from 'dependency-graph';
import { Pathy } from '@bscotch/pathy';
import { normalizeExtension } from './project.deps.js';
import type { Project } from './project.js';

export async function inferEntrypoints(project: Project) {
  // Get the src root, and then consolidate
  // all src files into the subset that can
  // be interpreted as entrypoints.
  // - For a folder, if there is an index file
  //   that that's the entrypoint.
  // - For a file, if it has an infix name but
  //   otherwise matches a file without the
  //   infix, the non-infixed file is the entrypoint.
  const srcDir = await project.srcDir();
  const depGraphWait = inferProjectDependencyGraph(project);
  const entrypoints: Set<string> = new Set();
  const entrypointsWait = srcDir.listChildrenRecursively({
    async filter(path, siblings) {
      if (!(await path.isFile())) {
        return;
      }
      if (path.basename.match(/^index\./)) {
        return true;
      }
      if (siblings.some((sib) => sib.basename.match(/^index\./))) {
        return false;
      }
      const infix = path.parseInfix();
      if (infix.infix) {
        return false;
      }
      return true;
    },
    onInclude(path: Pathy) {
      entrypoints.add(path.relative);
    },
  });
  const [depGraph] = await Promise.all([depGraphWait, entrypointsWait]);

  // Return in dependency order
  return depGraph
    .overallOrder()
    .map((path) => normalizeExtension(path, 'ts'))
    .filter((path) => entrypoints.has(path));
}

export async function inferProjectDependencyGraph(project: Project) {
  const nodeNames: Set<string> = new Set();
  const graph = new DepGraph({ circular: true });
  const ensureNode = (name: string) => {
    if (!nodeNames.has(name)) {
      nodeNames.add(name);
      graph.addNode(name);
    }
  };

  (await project.listSourceFiles()).forEach((f) => {
    const name = normalizeExtension(
      new Pathy(f.getFilePath(), project.dir).relative,
    );
    ensureNode(name);
  });

  const deps = (await project.inferDependencies()).internal || {};
  for (const depName of Object.keys(deps)) {
    ensureNode(depName);
    // Add all of its edges (clean up dupes later)
    for (const importer of deps[depName]) {
      const importerPath = importer.importerSrc;
      ensureNode(importerPath);
      graph.addDependency(importerPath, depName);
    }
  }
  return graph;
}
