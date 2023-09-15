import { expect } from 'chai';
import { generateChangelogs } from './changelog.js';
import { listRepoManifests } from './deps.js';

describe('Changelogs', function () {
  it('can create a changelog', async function () {
    const projects = await listRepoManifests('.');
    const headerPattern =
      /^(?<type>fix|feat|chore|docs|refactor|style|test)(\((?<scope>[^)]*)\))?: (?<subject>.*)$/;
    for (const project of projects) {
      const changelogs = generateChangelogs(project, {
        versionPattern: new RegExp(`^${project.package.name}@(?<version>.*)$`),
        headerPatterns: [headerPattern],
        headerVariablePatterns: [headerPattern],
      });
      expect(changelogs.length).to.be.greaterThan(0);
    }
  });
});
