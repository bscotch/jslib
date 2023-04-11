import { PackageJson, PackageJsonData } from '@bscotch/config';
import { Pathy } from '@bscotch/pathy';
import type { TsConfigJson } from 'type-fest';
import { ProjectCreateOptions } from './project.js';

/**
 * Create a new project. Returns the directory
 * in which the project was created.
 */
export async function createNewProject(projectInfo: ProjectCreateOptions) {
  const outDir = projectInfo.outDir || 'dist';
  const srcDir = projectInfo.srcDir || 'src';

  // Make sure we can use the target location
  const dir = new Pathy(projectInfo.dir);
  if (!projectInfo.dryRun) {
    await dir.ensureDirectory();
    await dir.isEmptyDirectory({ assert: true });
  } else {
    console.log('Ensure output directory exists and is empty:', dir.absolute);
  }

  // Create the package.json file
  const pkg: PackageJsonData = {
    name: projectInfo.name,
    version: projectInfo.version!,
    type: 'module',
    private: true,
    exports: {
      '.': {
        types: `./${outDir}/index.d.ts`,
        import: `./${outDir}/index.js`,
      },
    },
    main: `${outDir}/index.js`,
    types: `${outDir}/index.d.ts`,
    scripts: {
      build: 'tsc --build',
      test: 'mocha --config ../../config/.mocharc.cjs',
      'test:dev':
        'mocha --config ../../config/.mocharc.cjs --forbid-only=false --parallel=false --timeout=9999999999',
      watch: 'tsc --build --watch',
    },
  };
  if (!projectInfo.dryRun) {
    await PackageJson.createPackage(dir, pkg);
  } else {
    console.log(
      `Create package.json at: ${dir.absolute}`,
      'with content\n',
      pkg,
    );
  }

  // Create .npmignore
  const npmignoreContent = `*\n!dist/**/*\n!types/**/*\n`;
  if (!projectInfo.dryRun) {
    await dir.addFileToDirectory('.npmignore', npmignoreContent);
  } else {
    console.log(
      `Create .npmignore at: ${dir.absolute}`,
      'with content\n',
      npmignoreContent,
    );
  }

  // Create source index
  const sourceRoot = dir.resolveTo(projectInfo.srcDir!);
  if (!projectInfo.dryRun) {
    await sourceRoot.ensureDirectory();
    await sourceRoot.addFileToDirectory(
      'index.ts',
      `export default undefined;\n`,
    );
  } else {
    console.log(
      `Create source index at: ${sourceRoot.join('index.ts').absolute}`,
    );
  }

  // Create typescript configs
  const entryTsconfig: TsConfigJson = {
    include: ['src/**/*.ts'],
    compilerOptions: {
      types: ['node', 'mocha', 'chai'],
      outDir,
      rootDir: srcDir,
      baseUrl: srcDir,
    },
  };

  if (projectInfo?.extendsTsconfigPath) {
    const relativePath = dir.relativeTo(projectInfo.extendsTsconfigPath);
    entryTsconfig.extends = relativePath;
  }

  if (!projectInfo.dryRun) {
    await dir.addFileToDirectory('tsconfig.json', entryTsconfig);
  } else {
    console.log(
      `Create entry tsconfig at: ${dir.join('tsconfig.json').absolute}`,
      'with content\n',
      entryTsconfig,
    );
  }
  return dir;
}
