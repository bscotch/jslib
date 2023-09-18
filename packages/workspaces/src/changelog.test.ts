import { expect } from 'chai';
import {
  generateStructuredChangelogs,
  parseMonorepoConventionalCommits,
} from './changelog.js';
import { listRepoManifests } from './deps.js';

describe('Changelogs', function () {
  it('can create a changelog', async function () {
    const projects = await listRepoManifests('.');
    const headerPattern =
      /^(?<type>fix|feat|chore|docs|refactor|style|test|meta)(\((?<scope>[^)]*)\))?: (?<subject>.*)/;
    for (const project of projects) {
      if (project.isRoot || project.package.name === '@bscotch/workspaces') {
        continue;
      }
      const changelogs = generateStructuredChangelogs(project, {
        versionPattern: new RegExp(`^${project.package.name}@(?<version>.*)$`),
        headerPatterns: [headerPattern],
        headerVariablePatterns: [headerPattern],
      });
      expect(
        changelogs.length,
        `Project ${project.package.name} has no changes`,
      ).to.be.greaterThan(0);
    }
  });

  it('can create monorepo changelogs', async function () {
    const changelogs = await parseMonorepoConventionalCommits('.', {
      types: [
        { pattern: /^fix|bug(fix)?$/, group: 'Bug Fixes' },
        { pattern: /^feat|feature$/, group: 'Features' },
        {
          pattern: /^chore|build|ci|docs|style|refactor|perf$/,
          group: 'Other',
        },
      ],
    });
  });
});
