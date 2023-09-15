import { globby } from 'globby';
import fsp from 'node:fs/promises';
import path from 'node:path';
import type {
  PackageJson,
  ManifestInfo,
  ManifestGraphOptions,
  ManifestGitInfo,
} from './deps.types.js';
import { DepGraph } from 'dependency-graph';
import { getRepoRoot, listGitLogs } from './repo.js';
import { getDirectory, normalizePath } from './utility.js';

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
export async function listManifests(rootDir: string): Promise<ManifestInfo[]> {
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
  const manifests = await Promise.all(
    paths.map(async (p) => {
      const packagePath = path.join(rootDir, p);
      const packageJson = await fsp.readFile(packagePath, 'utf8');
      const parsed = JSON.parse(packageJson) as PackageJson;
      const info: ManifestInfo = {
        absolutePath: packagePath,
        relativePath: p,
        isRoot: p === 'package.json',
        package: parsed,
      };
      return info;
    }),
  );
  return manifests;
}

/**
 * Starting from `fromDir`, figure out what the root of the repo is
 * and then list all `package.json` files in the repo as absolute paths.
 */
export async function listRepoManifests(
  rootDir: string,
): Promise<ManifestGitInfo[]> {
  const repoRoot = await getRepoRoot(rootDir);
  const [manifests, logs] = await Promise.all([
    listManifests(repoRoot),
    listGitLogs(repoRoot),
  ]);
  return manifests.map((p) => {
    /** Find logs that include files within this package's directory */
    let packageDir = getDirectory(p.relativePath);
    packageDir = packageDir ? packageDir + '/' : '';
    const relevantLogs = logs.filter((log) =>
      log.affected.find((a) => normalizePath(a).startsWith(packageDir)),
    );
    const info: ManifestGitInfo = {
      ...p,
      logs: relevantLogs,
    };
    return info;
  });
}
