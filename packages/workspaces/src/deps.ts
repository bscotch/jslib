import { globby } from 'globby';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { ok } from 'node:assert';
import type {
  PackageJson,
  ListManifestOptions,
  ManifestInfo,
  ManifestGraphOptions,
} from './deps.types.js';
import { DepGraph } from 'dependency-graph';

/**
 * Given a list of manifests, return a graph of how they depend on each other.
 */
export function createDependencyGraph(
  manifests: ManifestInfo[],
  options?: ManifestGraphOptions,
): DepGraph<ManifestInfo> {
  const depTypes = (
    ['dependencies', 'devDependencies', 'peerDependencies'] as const
  ).filter((t) => !options?.excludeDependencies?.includes(t));
  const protocols = (['semver', 'file', 'workspace'] as const).filter(
    (p) => !options?.excludeProtocols?.includes(p),
  );
  manifests = manifests.filter((m) => options?.includeRoot || !m.isRoot);

  const graph = new DepGraph<ManifestInfo>();
  // Add all of the nodes first
  for (const manifest of manifests) {
    graph.addNode(manifest.package.name, manifest);
  }
  // Then add all of the edges
  for (const manifest of manifests) {
    for (const depType of depTypes) {
      const deps = manifest.package[depType];
      for (const [depName, depVersion] of Object.entries(deps || {})) {
        const dep = manifests.find((m) => m.package.name === depName);
        if (!dep) {
          continue;
        }
        const protocol = depVersion.split(':')[0] || 'semver';
        if (protocols.includes(protocol as any)) {
          graph.addDependency(manifest.package.name, dep.package.name);
        }
      }
    }
  }
  return graph;
}

/**
 * Start in `rootDir`, find all `package.json` files recursively
 * (excluding those ignored by .gitignore), and return their paths
 * *relative to* `rootDir`.
 */
export async function listManifests(
  rootDir: string,
  options: ListManifestOptions & { objectMode: true },
): Promise<ManifestInfo[]>;
export async function listManifests(
  rootDir: string,
  options?: ListManifestOptions,
): Promise<string[]>;
export async function listManifests(
  rootDir: string,
  options?: ListManifestOptions,
): Promise<string[] | ManifestInfo[]> {
  const cwd = process.cwd();
  rootDir = path.resolve(cwd, rootDir);
  const paths = (
    await globby('**/package.json', {
      cwd: rootDir,
      gitignore: true,
      onlyFiles: true,
      followSymbolicLinks: false,
    })
  ).sort();
  if (options?.objectMode) {
    const manifests = await Promise.all(
      paths.map(async (p) => {
        const packagePath = path.join(rootDir, p);
        const packageJson = await fsp.readFile(packagePath, 'utf8');
        const parsed = JSON.parse(packageJson) as PackageJson;
        const info: ManifestInfo = {
          path: packagePath,
          isRoot: p === 'package.json',
          package: parsed,
        };
        return info;
      }),
    );
    return manifests;
  }
  return paths.sort();
}

/**
 * Starting from `fromDir`, figure out what the root of the repo is
 * and then list all `package.json` files in the repo as absolute paths.
 */
export async function listRepoManifests(fromDir: string) {
  const repoRoot = await getRepoRoot(fromDir);
  const manifests = await listManifests(repoRoot);
  return manifests.map((p) => path.join(repoRoot, p)).sort();
}

/**
 * Starting from `fromDir`, work backwards to find the git repo
 * root (defined as the first folder found containing a `.git` directory)
 */
export async function getRepoRoot(fromDir: string) {
  let rootDir = path.resolve(process.cwd(), fromDir);
  while (true) {
    try {
      const stat = await fsp.stat(path.join(rootDir, '.git'));
      ok(stat.isDirectory(), `Found .git entry, but it was not a directory`);
      break;
    } catch (err) {
      const parent = path.dirname(rootDir);
      if (parent === rootDir) {
        throw new Error(
          `No .git directory found in "${fromDir}" or any parent directories`,
        );
      }
      rootDir = parent;
    }
  }
  return rootDir;
}
