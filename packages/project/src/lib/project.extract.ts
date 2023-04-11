import { Pathy } from '@bscotch/pathy';
import '@bscotch/utility';
import { UserError } from '@bscotch/validation';
import { ok } from 'assert';
import { DepGraph } from 'dependency-graph';
import { copy } from 'fs-extra';
import { ExportDeclaration, ImportDeclaration, SourceFile } from 'ts-morph';
import { createNewProject } from './project.create.js';
import { normalizeExtension } from './project.deps.js';
import { inferProjectDependencyGraph } from './project.graph.js';
import { Project, ProjectExtractOptions } from './project.js';

/**
 * Given an existing project, extract a subset
 * of it into a new project.
 */
export async function extractProject(
  sourceProject: Project,
  options: ProjectExtractOptions,
) {
  const depGraphWait = inferProjectDependencyGraph(sourceProject);

  const extractingRelativeFiles = await findFilesToExtractFromEntrypoints(
    sourceProject.dir,
    options.entrypoints,
  );
  const extractingFiles = extractingRelativeFiles.map(
    (f) => new Pathy(f, sourceProject.dir),
  );
  console.log('Extracting files:', extractingRelativeFiles);

  // Find all dependencies of the found files. If any aren't included in the found files, report that and throw an error.
  const depGraph = await depGraphWait;
  throwIfMissingDeps(extractingRelativeFiles, depGraph);

  // Create the new project first by copying
  // everything over and setting up a default
  // entrypoint.

  // Find the tsconfig to extend, if there is one
  const extendsTsconfigPath = await (await sourceProject.tsconfig()).extends();

  const newProjectDir = await createNewProject({
    ...options,
    extendsTsconfigPath,
  });

  console.log('Copying extracted files...');
  await copyExtractableFiles(
    extractingRelativeFiles,
    sourceProject,
    newProjectDir,
    options,
  );

  console.log('Updating index.ts barrel file...');
  await updateEntrypointBarrelFile(sourceProject, newProjectDir, options);

  console.log('Populating package.json...');
  if (!options.dryRun) {
    await updatePackageJsons(newProjectDir, sourceProject);
  }

  console.log('Discovering exported tokens...');
  const exportedTokens = await remapSourceProjectImports(
    sourceProject,
    extractingFiles,
    options,
  );

  // Delete the copies still in this project
  console.log(
    'Deleting extracted files f rom source\n',
    extractingFiles.map((f) => f.absolute),
  );
  if (!options.dryRun) {
    const deleteWaits = extractingFiles.map((f) => f.delete());
    await Promise.all([...deleteWaits, sourceProject.clean()]);
  }

  return { newProjectDir, exportedTokens };
}

/**
 * After a project has been extracted from another
 * project, we'll have a list of named tokens that
 * *used* to be importable from the old project but
 * are now only importable from the new project.
 *
 * This method will work through the source code
 * of an importing project to split out the named
 * imports that are no longer valid.
 */
export async function splitImportDeclarationAfterExtraction(
  project: Project,
  extractionSourceProjectName: string,
  extractionTargetProjectName: string,
  movedTokens: Set<string>,
  options?: { dryRun?: boolean },
) {
  const morpher = await project.codeMorpher();
  const sourceFiles = morpher.getSourceFiles();

  const updateSplitDeclarations = (
    sourceFile: SourceFile,
    declaration: ImportDeclaration | ExportDeclaration,
  ) => {
    if (declaration.getModuleSpecifierValue() !== extractionSourceProjectName) {
      return;
    }

    const namedTokens =
      'getNamedImports' in declaration
        ? declaration.getNamedImports()
        : declaration.getNamedExports();

    const tokensToSplit: string[] = [];

    for (const namedToken of namedTokens) {
      const name = namedToken.getText();
      if (!movedTokens.has(name)) {
        continue;
      }
      console.log('Splitting out token', name);
      tokensToSplit.push(name);
      namedToken.remove();
    }
    if (tokensToSplit.length && !options?.dryRun) {
      if ('getNamedImports' in declaration) {
        sourceFile.addImportDeclaration({
          moduleSpecifier: extractionTargetProjectName,
          namedImports: tokensToSplit,
        });
      } else {
        sourceFile.addExportDeclaration({
          moduleSpecifier: extractionTargetProjectName,
          namedExports: tokensToSplit,
        });
      }
    }
  };

  for (const sourceFile of sourceFiles) {
    // Find any imports matching the source project name
    const splitters = [
      ...sourceFile.getImportDeclarations(),
      ...sourceFile.getExportDeclarations(),
    ];
    splitters.forEach((splitter) =>
      updateSplitDeclarations(sourceFile, splitter),
    );
  }
  if (!options?.dryRun) {
    await morpher.save();
  }
}

/**
 * Locally update all the files that
 * depended on these files, to now point to
 * the new project.
 *
 * While we're at it, identify all of the named
 * imports and exports that will no longer be valid,
 * so that *other* projects can be updated.
 *
 * @returns The set of named exports found in the extractable files
 */
async function remapSourceProjectImports(
  sourceProject: Project,
  extractingFiles: Pathy[],
  options: ProjectExtractOptions,
) {
  const morpher = await sourceProject.codeMorpher();
  const importsToReplace: ImportDeclaration[] = [];
  const exportedTokenNames = new Set<string>();

  for (const extractingFile of extractingFiles) {
    // Find deps
    const sourceFile = morpher.getSourceFile(extractingFile.absolute);
    if (!sourceFile) {
      continue;
    }

    // Get all the exported tokens
    [...sourceFile.getExportedDeclarations().keys()].forEach((token) =>
      exportedTokenNames.add(token),
    );

    const sourceFilePath = sourceFile.getFilePath();

    // Find files referencing this one
    sourceFile?.getReferencingSourceFiles().forEach((f) => {
      if (extractingFiles.some((e) => e.equals(f.getFilePath()))) {
        // Skip files we're extracting
        return;
      }
      // Check each import to find those that are for
      // the current dependency (could be more than one
      // statement importing the same target).
      f.getImportDeclarations().forEach((declaration) => {
        const declarationSource = declaration.getModuleSpecifierSourceFile();
        const declarationSourcePath = declarationSource?.getFilePath();
        if (declarationSourcePath === sourceFilePath) {
          importsToReplace.push(declaration);
        }
        return false;
      });
    });
  }

  if (!options.dryRun) {
    importsToReplace.forEach((declaration) => {
      declaration.setModuleSpecifier(options.name);
    });
    await morpher.save();
  } else {
    console.log(
      'Replace imported module specifiers in source project with the new project name',
      options.name,
      '▶',
    );
    for (const toReplace of importsToReplace) {
      console.log(
        '  ',
        toReplace.getSourceFile().getFilePath(),
        toReplace.getText(),
      );
    }
  }

  return exportedTokenNames;
}

async function updateEntrypointBarrelFile(
  sourceProject: Project,
  newProjectDir: Pathy,
  options: ProjectExtractOptions,
) {
  const sourceProjectSrcDir = await sourceProject.srcDir();
  const newProjectSrcDir = newProjectDir.join(sourceProjectSrcDir.relative);
  const newEntrypointContent =
    options.entrypoints
      .map((path) => {
        const relativePath = new Pathy(path, newProjectDir).relativeFrom(
          newProjectSrcDir,
        );
        return `export * from './${normalizeExtension(relativePath, 'js')}';`;
      })
      .join('\n') + '\n';

  if (!options.dryRun) {
    await newProjectSrcDir.join('index.ts').write(newEntrypointContent);
  } else {
    console.log(
      'Write to barrel file',
      newProjectSrcDir.join('index.ts').absolute,
      '▶\n',
      newEntrypointContent,
    );
  }
}

async function copyExtractableFiles(
  extractingRelativeFiles: string[],
  sourceProject: Project,
  newProjectDir: Pathy,
  options: ProjectExtractOptions,
) {
  const copyWaits = extractingRelativeFiles.map((path) => {
    const from = new Pathy(path, sourceProject.dir).absolute;
    const to = new Pathy(path, newProjectDir).absolute;
    if (options.dryRun) {
      console.log('Copy', from, '▶', to);
      return;
    } else {
      return copy(from, to);
    }
  });
  await Promise.all(copyWaits);
}

async function updatePackageJsons(
  newProjectDir: Pathy,
  sourceProject: Project,
) {
  const projectConstructor = sourceProject.constructor as typeof Project;
  const newProject = new projectConstructor({
    dir: newProjectDir,
  });

  await newProject.updateDependencyListings();
  await newProject.updateDependencyListings();
  await sourceProject.packageJson.addDependency(newProject.name, {
    version: newProject.packageJson.version,
  });
}

/**
 * Get the list of files that the entrypoints imply
 * should also be extracted.
 */
async function findFilesToExtractFromEntrypoints(
  dir: Pathy,
  entrypoints: string[],
) {
  /**
   * The real filepaths that we're
   * going to extract.
   */
  const extractingFilesSet = new Set<string>();

  const addExport = (path: Pathy) => {
    extractingFilesSet.add(path.relative);
  };

  // For each entrypoint, find all
  // corresponding files.
  for (const entrypoint of entrypoints) {
    const entrypointPath = new Pathy(entrypoint, dir);

    ok(
      dir.isParentOf(entrypointPath),
      `${entrypoint} is not a child of ${dir}`,
    );
    ok(
      await entrypointPath.exists(),
      `Entrypoint "${entrypointPath}" does not exist`,
    );
    ok(!entrypointPath.equals(dir), 'Entrypoint cannot be the project root');

    // Grab matching siblings (includes self)
    const sibs = await entrypointPath.listSiblings();

    const entrypointParsed = entrypointPath.parseInfix();
    for (const sib of sibs) {
      const sibParsed = sib.parseInfix();
      if (sibParsed.name !== entrypointParsed.name) {
        continue;
      }
      // If this is a folder, add all of its
      // children.
      if (await sib.isDirectory()) {
        await sib.listChildrenRecursively({
          onInclude(child: Pathy): any {
            addExport(child);
          },
        });
      }
      addExport(sib);
    }
  }
  return [...extractingFilesSet];
}

function throwIfMissingDeps(
  extractingFiles: string[],
  depGraph: DepGraph<any>,
) {
  const missingDeps: Set<string> = new Set();
  for (const extractingFile of extractingFiles) {
    if (!depGraph.hasNode(normalizeExtension(extractingFile))) {
      continue;
    }
    const deps = depGraph.dependenciesOf(normalizeExtension(extractingFile));
    for (const dep of deps) {
      const depAsTs = normalizeExtension(dep, 'ts');
      if (!extractingFiles.includes(depAsTs)) {
        missingDeps.add(dep);
      }
    }
  }

  if (missingDeps.size > 0) {
    console.error(
      'Extraction blocked by excluded dependencies:',
      depGraph.overallOrder().filter((d) => missingDeps.has(d)),
    );
    throw new UserError(
      `The extraction files have dependencies that are not included in the extraction. Either include them or update the code to remove those dependencies.`,
    );
  }
}
