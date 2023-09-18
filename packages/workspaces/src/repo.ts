import fsp from 'node:fs/promises';
import path from 'node:path';
import { ok } from 'node:assert';
import { simpleGit } from 'simple-git';
import type { GitLog } from './repo.types.js';

/**
 * Get the parsed git logs for the given repo.
 */
export async function listGitLogs(repo = process.cwd()) {
  const gitRoot = await getRepoRoot(repo);
  const git = simpleGit({ baseDir: gitRoot });
  const logs =
    // @ts-expect-error Additional options are allowed but are not in the typedef
    await git.log({
      multiLine: true,
      '--topo-order': true,
      '--stat': true,
    });
  return logs.all.map((log) => {
    const tags = log.refs
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.startsWith('tag: '))
      .map((s) => s.replace(/^tag:\s+/, ''));
    const parsed: GitLog = {
      author: {
        name: log.author_name,
        email: log.author_email,
      },
      date: new Date(log.date),
      body: log.body,
      hash: log.hash,
      tags,
      affected: log.diff?.files.map((diff) => diff.file) || [],
    };
    return parsed;
  });
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
