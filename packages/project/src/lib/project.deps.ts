import type {
  PackageJsonDependencyType,
  PackageNameConstructable,
  TsConfig,
} from '@bscotch/config';
import { PackageName } from '@bscotch/config';
import { Pathy } from '@bscotch/pathy';
import { isNodeNativeModule } from '@bscotch/utility';
import { ok } from 'assert';
import path from 'path';
import { ExportDeclaration, ImportDeclaration } from 'ts-morph';
import type {
  Project,
  ProjectBuildOptions,
  ProjectUpdateDepOptions,
} from './project.js';

interface ImportInfo {
  /**
   * The path to the importer of this dependency,
   * relative to the project root.
   */
  importerSrc: string;
  importerOut: string;
  onlyTypes?: boolean;
}

export type ProjectDependencies = { sourceFiles: Pathy[] } & {
  [DepType in 'external' | 'internal' | 'node']?: {
    /**
     * The dependency name, if it's external or node,
     * otherwise the path to the dependency from the
     * project's root.
     */
    [depName: string]: ImportInfo[];
  };
};

/**
 * Make sure that all dependencies are listed in the appropriate
 * `package.json` files.
 */
export async function updateProjectDependencyListings(
  project: Project,
  options?: ProjectBuildOptions,
): Promise<void> {
  const deps = (await project.inferDependencies()).external || {};
  const depNames = Object.keys(deps);
  const includedDeps: string[] = [];
  /**
   * Normalized, project-relative paths
   */
  const packingList = new Set(
    (await project.packageJson.packingList()).map((s) => s.relative),
  );

  for (const depName of depNames) {
    const inPackedFiles = deps[depName].filter((d) =>
      packingList.has(d.importerOut),
    );
    const onlyDev = inPackedFiles.every(
      (d) => d.onlyTypes || path.basename(d.importerSrc) === 'package.json',
    );
    includedDeps.push(depName);

    const depType: PackageJsonDependencyType =
      onlyDev || !inPackedFiles ? 'devDependencies' : 'dependencies';

    await project.updateDependencyListing(depName, depType, {
      ...options,
      isTypeOnly: inPackedFiles.every((d) => d.onlyTypes),
    });
  }

  // Check if tslib is needed
  const usingImportHelpers = (await project.compilerOptions()).importHelpers;
  if (usingImportHelpers) {
    await project.updateDependencyListing('tslib', 'dependencies', options);
  }
  // Ensure that Typescript is listed
  await project.updateDependencyListing(
    'typescript',
    'devDependencies',
    options,
  );

  const protectedByConfig = project.packageJson.get('trebuchet')?.keep;

  const protectFromPruning = [
    ...(options?.protectFromPruning || []),
    ...(usingImportHelpers ? ['tslib'] : []),
    ...(protectedByConfig?.dependencies || []),
    ...(protectedByConfig?.devDependencies || []),
    'typescript',
  ];

  await project.packageJson.pruneDependencies({
    keep: [
      ...includedDeps,
      ...protectFromPruning,
      // Ensure that any paired DefinitelyTyped dependencies are kept
      ...[...includedDeps, ...protectFromPruning].map((d) => `@types/${d}`),
    ],
  });

  // Ensure `@types/` deps are listed in devDeps
  const allDeps = project.packageJson.flattenedDependencies();
  for (const [dep, def] of Object.entries(allDeps)) {
    if (dep.startsWith('@types/') && def.type !== 'devDependencies') {
      await project.packageJson.addDependency(dep, {
        ...def,
        type: 'devDependencies',
      });
    }
  }
}

/**
 * Find the version that this dependency should be listed as,
 * and ensure that's true in all appropriate files (if possible).
 */
export async function updateProjectDependencyListing(
  project: Project,
  dep: string,
  depType: PackageJsonDependencyType,
  options: ProjectUpdateDepOptions | undefined,
): Promise<'updated' | 'added' | undefined> {
  let version = project.packageJson.findDependency(dep)?.version.toString();
  if (!version && options?.isTypeOnly) {
    // See if we have a types package already
    version = project.packageJson
      .findDependency(`@types/${dep}`)
      ?.version.toString();
  }

  // Check any provided local packages
  if (options?.localPackages) {
    const localMatch = options.localPackages.find(
      (localPkg) => localPkg.name.equals(dep) && !localPkg.equals(project),
    );
    project.trace(
      `updateDependencyListing: checking local packages; found? ${!!localMatch}`,
    );
    const localMatchVersion = localMatch?.packageJson.version;
    ok(!localMatch || localMatchVersion, `No version found for ${dep}`);
    if (localMatch && project.packageJson.packageManager === 'npm') {
      version = localMatchVersion ? `^${localMatchVersion}` : undefined;
    } else if (localMatch) {
      version = 'workspace:*';
    }
  }

  // If we don't have a version yet, check workspace
  // projects (if they exist) for a matching dep and
  // use that version.
  for (const otherProject of project.workspaceProjects) {
    if (version || otherProject.name.toString() === project.name.toString()) {
      continue;
    }
    version = otherProject.packageJson.findDependency(dep)?.version.toString();
  }

  // WHEW. If we don't have a version after all of that, then
  // this dependency is not listed ANYWHERE.
  ok(version, `No version found for ${dep} in project ${project.name}.`);

  // Ensure that the current project has this same version
  return await project.packageJson.addDependency(dep, {
    version,
    type: depType,
  });
}

export async function inferProjectDependencies(
  project: Project,
): Promise<ProjectDependencies> {
  let deps = await inferProjectTypescriptDeps(project);
  deps = await inferProjectNonTypescriptDeps(project, deps);
  deps = await inferProjectBinaryDeps(project, deps);
  return deps;
}

/**
 * While {@link inferProjectTypescriptDeps} is great
 * for pure Typescript projects, aligning inferred deps with
 * exactly what the source contains, some projects include
 * non-Typescript-managed files (e.g. root `.js` scripts).
 *
 * This function will attempt to infer dependencies from
 * files that fall outside of the Typescript compiler's scope.
 */
export async function inferProjectNonTypescriptDeps(
  project: Project,
  deps: ProjectDependencies,
): Promise<ProjectDependencies> {
  const tsconfig = await project.tsconfig();
  const outDir = await tsconfig.outDir();
  const srcDir = await tsconfig.srcDir();
  const trackedFiles = (await project.listTrackedFiles())
    .filter((p) => {
      return [
        '.svelte',
        '.js',
        '.ts',
        '.mjs',
        '.mts',
        '.cjs',
        '.cts',
        '.vue',
      ].some((ext) => p.endsWith(ext));
    })
    .map((p) => project.dir.join(p));
  const waits: Promise<any>[] = [];
  for (const file of trackedFiles) {
    // Ignore anything included in Typescript's control
    if (srcDir.isParentOf(file) || outDir.isParentOf(file)) {
      continue;
    }
    const wait = file.read<string>().then((content) => {
      const imports = parseFileForImports(content);
      const info = normalizeInternalDependencyPath(
        file,
        project.dir,
        project.dir,
        project,
      );
      deps.sourceFiles.push(file);
      for (const imported of imports) {
        const type = dependencyTypeFromLiteral(imported);
        deps[type] ||= {};
        deps[type]![imported] ||= [];
        deps[type]![imported]!.push({
          importerOut: info.outFile,
          importerSrc: info.srcFile,
        });
      }
    });
    waits.push(wait);
  }
  await Promise.all(waits);
  return deps;
}

export async function inferProjectBinaryDeps(
  project: Project,
  deps: ProjectDependencies,
): Promise<ProjectDependencies> {
  const binaries = await discoverPackageBinaries(project);
  const scripts = Object.values(project.packageJson.scripts).join('\n');
  if (!scripts) {
    return deps;
  }
  for (const [bin, pkgName] of Object.entries(binaries)) {
    const regex = new RegExp(`(\\b)(?<![/"'])${bin}(?![/"'])\\b`, 'g');
    // Is this binary referenced in the scripts?
    if (!scripts.match(regex)) {
      continue;
    }
    const info = normalizeInternalDependencyPath(
      project.packageJson.path,
      project.dir,
      project.dir,
      project,
    );
    deps.external ||= {};
    deps.external[pkgName] ||= [];
    deps.external[pkgName].push({
      importerOut: info.outFile,
      importerSrc: info.srcFile,
    });
  }
  return deps;
}

/**
 * Recurse through `node_modules` folders, looking
 * at each installed package's `package.json` file
 * for listed binaries. Returns a map of binary name
 * to source package name.
 */
export async function discoverPackageBinaries(project: Project) {
  // Work backwards through node_modules until we hit
  // a repo root. Look in each package for its listed
  // `/bin` keys. That's the list of binaries we might
  // be calling in the package.json scripts.
  const binaries: { [binaryName: string]: string } = {};
  let curdir = project.dir;
  const repoRoot = (await curdir.findInParents('.git'))?.up();
  if (!repoRoot) {
    return binaries;
  }
  while (repoRoot.isParentOf(curdir)) {
    const nextNodeModules = await curdir.findInParents('node_modules');
    if (!nextNodeModules || !repoRoot.isParentOf(nextNodeModules)) {
      break;
    }
    for (const scope of await nextNodeModules.listChildren()) {
      const pkgs: Pathy[] = scope.basename.startsWith('@')
        ? await scope.listChildren()
        : [scope];
      for (const pkg of pkgs) {
        const pkgJsonPath = pkg.join('package.json');
        if (!(await pkgJsonPath.exists())) {
          continue;
        }
        const pkgJson = await pkgJsonPath.read<{
          name: string;
          bin?: string | { [dep: string]: string };
        }>();
        if (pkgJson.bin && !binaries[pkgJson.name]) {
          if (typeof pkgJson.bin === 'string') {
            binaries[pkgJson.name] = pkgJson.name;
          } else {
            for (const bin of Object.keys(pkgJson.bin)) {
              binaries[bin] = pkgJson.name;
            }
          }
        }
      }
    }
    curdir = nextNodeModules.up(2);
  }
  return binaries;
}

/**
 * Find all string literals from import and require
 * statements.
 */
export function parseFileForImports(content: string) {
  const patterns = [
    /\bimport\b[\s,\w]+?(?:\{[\s,\w]+?\})?[\s,\w]*?\bfrom\b\s+["'](?<name>[^'"]+)["']/gms,
    /\b(?:require|import)\b\s*\(\s*["'](?<name>[^'"]+)["']\s*\)/gms,
  ];
  const imported: string[] = [];
  for (const pattern of patterns) {
    for (const match of content.matchAll(pattern)) {
      let literal = match.groups?.name as string;
      const extendedImport = literal.match(/^((@[^/]+\/[^/]+)|([^/@]+))\/.*$/);
      if (extendedImport) {
        literal = extendedImport[1];
      }
      imported.push(literal);
    }
  }
  return imported;
}

export async function inferProjectTypescriptDeps(
  project: Project,
): Promise<ProjectDependencies> {
  const deps: ProjectDependencies = { sourceFiles: [] };
  const tsconfig = await project.tsconfig();
  const morpher = await project.codeMorpher();
  const outDir = await tsconfig.outDir();
  const srcDir = await tsconfig.srcDir();
  const depAdds: Promise<any>[] = [];
  morpher.getSourceFiles().forEach((f) => {
    const srcPath = new Pathy(f.getFilePath(), project.dir);
    deps.sourceFiles.push(srcPath);
    const importer = normalizeInternalDependencyPath(
      srcPath,
      srcDir,
      outDir,
      project,
    );
    depAdds.push(
      ...f
        .getExportDeclarations()
        .map((d) => addDependencyToSummary(d, importer, deps, tsconfig)),
      ...f
        .getImportDeclarations()
        .map((i) => addDependencyToSummary(i, importer, deps, tsconfig)),
    );
  });
  await Promise.all(depAdds);
  return deps;
}

/**
 * Given a string literal from an import/require
 * statement, determine its likely relational type
 * (internal, external, node).
 */
function dependencyTypeFromLiteral(
  depName: string,
): 'internal' | 'external' | 'node' {
  return depName.match(/^([./]|[$@~#]\/|[^a-z@])/)
    ? 'internal'
    : isNodeNativeModule(depName)
    ? 'node'
    : 'external';
}

async function addDependencyToSummary(
  declaration: ImportDeclaration | ExportDeclaration | undefined,
  importer: { srcFile: string; outFile: string },
  deps: ProjectDependencies,
  tsconfig: TsConfig,
): Promise<ProjectDependencies> {
  if (!declaration) {
    return deps;
  }
  let depName = declaration.getModuleSpecifierValue();
  if (!depName) {
    return deps;
  }
  let depType = dependencyTypeFromLiteral(depName);

  if (depType === 'external' && (await tsconfig.includes(depName))) {
    // Then is an alias from the tsconfig.
    depType = 'internal';
  }

  if (depType === 'internal') {
    // Normalize the path to be relative to the project root
    depName = Pathy.join(importer.srcFile, '..', depName);
  } else {
    // The external dependency could be used with an internal
    // import path, so trimming sub-paths is required.
    depName = depName.replace(/^(@[^/]+\/)?([^/]+).*/, '$1$2');
  }
  deps[depType] ||= {};
  deps[depType]![depName] ||= [];
  // May have duplicate importers due to
  // how incremental builds get managed
  const listedImporter = deps[depType]![depName].find(
    (d) => d.importerSrc === importer.srcFile,
  );

  if (listedImporter) {
    if (!declaration.isTypeOnly() && listedImporter.onlyTypes) {
      listedImporter.onlyTypes = false;
    }
  } else {
    deps[depType]![depName].push({
      importerSrc: importer.srcFile,
      importerOut: importer.outFile,
      onlyTypes: declaration.isTypeOnly(),
    });
  }
  return deps;
}

/**
 * A source typescript file can be referenced with the `.js` extensions instead of `.ts` (e.g. in import statements), results in output files ending with `.map.js`, `.d.ts`, and `.js`. These can also all use the `.cjs`/`.mjs` style variants of this.
 *
 * This function takes *any* such path and returns the appropriate `.js`-variant of it (matching what you'd see in an import path).
 *
 * @param to - Defaults to 'js'.
 *
 * @example
 * normalizeExtension('hello.d.ts'); // 'hello.js'
 * normalizeExtension('hello.cjs'); // 'hello.cjs'
 * normalizeExtension('hello.js.map'); // 'hello.js'
 */
export function normalizeExtension(path: string, to: 'js' | 'ts' = 'js') {
  return path.replace(/(\.d)?\.([mc])?[tj]s(\.map)?$/, `.$2${to}`);
}

function normalizeInternalDependencyPath(
  importer: Pathy,
  srcDir: Pathy,
  outDir: Pathy,
  project: Project,
): { srcFile: string; outFile: string } {
  const normalized = { srcFile: '', outFile: '' };
  const importerIsBuiltFile = outDir.isParentOf(importer);
  importer = new Pathy(normalizeExtension(importer.absolute), project.dir);
  if (importerIsBuiltFile) {
    normalized.outFile = importer.relative;
    normalized.srcFile = srcDir
      .join(outDir.relativeTo(importer))
      .relativeFrom(project.dir);
  } else {
    normalized.srcFile = importer.relative;
    normalized.outFile = outDir
      .join(srcDir.relativeTo(importer))
      .relativeFrom(project.dir);
  }
  return normalized;
}

/**
 * Change the name of a dependency used
 * by this project. This changes the `package.json`
 * entry for the dependency, and updates
 * all auto-discoverable source code references
 * as well.
 *
 * Assumes that if the `oldName` is not
 * found in the project's `package.json`
 * then it is *not* a dependency. This
 * function does nothing in that case.
 */
export async function renameProjectDependency(
  project: Project,
  oldName: PackageNameConstructable,
  newName: PackageNameConstructable,
  options?: { onlyPackageJson?: boolean },
): Promise<any> {
  // Update the package.json
  const packageJsonUpdate = await project.packageJson.renameDependency(
    oldName,
    newName,
  );
  if (options?.onlyPackageJson) {
    return await packageJsonUpdate;
  }

  const fromName = new PackageName(oldName);
  // Update the source code
  const morpher = await project.codeMorpher();
  for (const file of morpher.getSourceFiles()) {
    file
      .getImportDeclarations()
      .filter((imp) => fromName.equals(imp.getModuleSpecifierValue()))
      .forEach((imp) => imp.setModuleSpecifier(newName.toString()));
  }

  return Promise.all([packageJsonUpdate, morpher.save()]);
}
