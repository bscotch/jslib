import fsp from 'node:fs/promises';
import path from 'node:path';
import { ok } from 'node:assert';
import { exec } from 'child_process';

/**
 * Get the parsed git logs for the given repo.
 */
export async function listGitLogs(repo = process.cwd()) {
  const proc = exec(`git log --pretty=format:'%H %at'`, { cwd: repo });
  const stdout = await new Promise<string>((resolve, reject) => {
    let stdout = '';
    proc.stdout?.on('data', (chunk) => {
      stdout += chunk;
    });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`git log failed with exit code ${code}`));
      }
    });
  });
  console.log(stdout);
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
