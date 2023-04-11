import { Pathy } from '@bscotch/pathy';
import type { SourceFile } from 'ts-morph';
import { normalizeExtension } from './project.deps.js';
import type { Project, ProjectFixOptions } from './project.js';

/**
 * Fix source files by removing unused imports,
 * and resolving import paths to include the file
 * extension (using .js instead of .ts).
 *
 * @alpha
 */
export async function fixProjectSourceFiles(
  project: Project,
  options: ProjectFixOptions,
) {
  const pkgJsonFixWait =
    options.packageJson &&
    project.updateDependencyListings({
      localPackages: project.workspaceProjects,
    });

  const morpher = await project.codeMorpher();
  for (let sourceFile of morpher.getSourceFiles()) {
    const srcFilePath = new Pathy(sourceFile.getFilePath());

    if (options.organizeImports) {
      sourceFile.organizeImports();
    }
    if (options.addMissingImports) {
      sourceFile = sourceFile.fixMissingImports();
    }
    if (options.resolveModulePaths) {
      await resolveModulePaths(project, srcFilePath, sourceFile);
    }
  }
  await Promise.all([morpher.save(), pkgJsonFixWait]);
}

async function resolveModulePaths(
  project: Project,
  srcFilePath: Pathy,
  sourceFile: SourceFile,
) {
  // Identify all internal imports --
  // are their paths fully resolved, with
  // an appropriate extension?
  const imports = sourceFile.getImportDeclarations();
  const exports = sourceFile.getExportDeclarations();
  const tsconfig = await project.tsconfig();
  for (const declaration of [...imports, ...exports]) {
    const pathSpecifier = declaration.getModuleSpecifierValue();
    if (!pathSpecifier) {
      continue;
    }
    const importedFrom = declaration.getModuleSpecifierSourceFile();
    if (!importedFrom) {
      continue;
    }
    const specifierSourceFilePath = importedFrom.getFilePath();
    if (
      !(await tsconfig.includes(specifierSourceFilePath, {
        searchProjectReferences: true,
        cwd: srcFilePath,
      }))
    ) {
      continue;
    }
    let resolvedPath = normalizeExtension(
      new Pathy(specifierSourceFilePath, srcFilePath.directory).relative,
    );
    if (resolvedPath.match(/\bnode_modules\b/)) {
      // Then it's an internal dep!
      continue;
    }
    resolvedPath = resolvedPath.startsWith('.')
      ? resolvedPath
      : `./${resolvedPath}`;
    if (resolvedPath === pathSpecifier) {
      continue;
    }
    console.log('Resolving', pathSpecifier, 'to', resolvedPath);
    declaration.setModuleSpecifier(resolvedPath);
  }
}

// function fixInvalidInfixImports() {
//   // Make sure that this file is only importing
//   // allowed files.
//   const srcBasename = sourceFile.getBaseName();
//   const srcInfixParts = Pathy.parseInfix(srcBasename);
//   sourceFile.getImportDeclarations().forEach((d) => {
//     const importPath = d.getModuleSpecifierValue();
//     if (!importPath.match(/^[./]/)) {
//       // Then it's non-local
//       return;
//     }
//     const depInfixPatternParts = Pathy.parseInfix(importPath);
//     if (
//       !depInfixPatternParts?.infix ||
//       srcInfixParts?.name === depInfixPatternParts.name
//     ) {
//       return;
//     }
//     // Otherwise we've got a conflict!
//     // Change the import to be the infix-less
//     // version, and then ensure that the entrypoint
//     // exports that same stuff.
//     const importFile = d.getModuleSpecifierSourceFile()?.getFilePath();
//     if (!importFile) {
//       return;
//     }
//     const entrypoint = morpher.getSourceFile(Pathy.removeInfix(importFile));
//     if (!entrypoint) {
//       return;
//     }
//     const importStructure = d.getStructure();
//     entrypoint.addExportDeclaration({
//       assertElements: importStructure.assertElements,
//       isTypeOnly: importStructure.isTypeOnly,
//       namedExports: importStructure.namedImports,
//     });
//     console.log(
//       'ENTRYPOINT',
//       d.getStructure(),
//       entrypoint?.getFilePath(),
//       srcInfixParts,
//       depInfixPatternParts,
//     );
//   });
// }
