import {
  parseMonorepoConventionalCommits,
  renderMonorepoConventionalCommits,
} from '../packages/workspaces/dist/index.js';

const parsed = await parseMonorepoConventionalCommits('.', {
  types: [
    { pattern: /^fix|bug(fix)?$/, group: 'Fixes' },
    { pattern: /^feat(ure)?$/, group: 'Features' },
    { pattern: /^docs$/, group: 'Docs' },
  ],
});

await renderMonorepoConventionalCommits(
  parsed,
  (project, versions) => {
    if (project.isRoot) return;
    const title = `# Changelog - ${project.package.name}`;
    const versionStrings = versions.map((version) => {
      const header = `## ${version.version} (${
        version.date.toISOString().split('T')[0]
      })`;
      const groups = Object.keys(version.groups).sort();
      const sections = groups.map((group) => {
        const changes = version.groups[group];
        const commits = changes
          .map((commit) => `- ${commit.variables.description}`)
          .join('\n');
        return `### ${group}\n\n${commits}`;
      });
      return `${header}\n\n${sections.join('\n\n')}`;
    });
    return `${title}\n\n${versionStrings.join('\n\n')}`;
  },
  { filename: 'CHANGELOG.md' },
);
