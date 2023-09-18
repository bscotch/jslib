# Workspaces

Node monorepos (a.k.a. "workspaces") can be a pain to manage. This package provides some tools to help with bespoke monorepo management.

While package managers vary in how they identify packages in a monrepo, this package follows very simple rules:

- Any directory containing a `package.json` is considered a package.
- Any `package.json` file that is excluded by `.gitignore` rules is ignored.
- If there is a `package.json` in the git root, it is flagged as `isRoot` but otherwise treated like any other package.

## Installation

- `npm install @bscotch/workspaces`
- `pnpm add @bscotch/workspaces`

## Usage

### List all packages in a monorepo

```ts
import {listManifests, listRepoManifests} from '@bscotch/workspaces';

/**
 * List all packages recursively starting from "some/dir".
 */
const packages = await listManifests("some/dir");

/**
 * Find the repo root containing "some/dir", then list all packages
 * recursively from there. Git logs are included in the result,
 * separated by affected package. This is useful for e.g. creating
 * per-project changelogs or inferring version bumps based on commit
 * messages.
 */
const repoPackages = await listRepoManifests('some/dir');
```

### Create a dependency graph

It's useful to be able to create a dependency graph for the projects in a monorepo. This can be used to e.g. determine the order in which to build projects, or to determine which projects need to be rebuilt when a dependency changes, or to figure out how to bump versions based on dependency changes.

Different package managers have different ways of specifying local package relationships: `yarn` and `pnpm` use the `workspace:` protocol, and all managers support the `file:` protocol. Local dependencies that list a semver range without a protocol are ambiguous, since those could refer to either the local dependency or a specific published version of same.

The function to create a dependency graph therefore allows you to specify which protocols to exclude from the graph.

```ts
const packages = await listRepoManifests();
const graph = createDependencyGraph(packages, {
  excludeProtocols: ['semver'],
});
```


### Create changelogs

The [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) standards and projects are great, but they don't work well with monorepos and it is difficult to customize changelog output formats. This package provides tools to help with that.

> ⚠️ This commit parser has a significant departure from Conventional Commits: commit messages are allowed to have *multiple headings*. Basically, any line that matches the conventional commit heading format is treated as a separate entry. This allows for more flexibility in commit messages, and is especially useful for monorepos where a single commit may affect multiple packages or where commits are frequently squashed.

```ts
import {
  parseMonorepoConventionalCommits,
  renderMonorepoConventionalCommits,
} from '@bscotch/workspaces';

// Get grouped, structured commit message data from a monorepo
// on a per-package basis.
const parsed = await parseMonorepoConventionalCommits('.', {
  types: [
    { pattern: /^fix|bug(fix)?$/, group: 'Fixes' },
    { pattern: /^feat(ure)?$/, group: 'Features' },
    { pattern: "docs", group: 'Docs' },
  ],
});

await renderMonorepoConventionalCommits(
  parsed,
  (project, versions) => {
    if (project.isRoot) return;
    const title = `# Changelog - ${project.package.group}`;
    const versionStrings = versions.map((version) => {
      const header = `## ${version.version} (${
        version.date.toISOString().split('T')[0]
      })`;
      const sectionKeys = Object.keys(version.types).sort();
      const sections = sectionKeys.map((type) => {
        const changes = version.types[type];
        const commits = changes
          .map((commit) => `- ${commit.variables.description}`)
          .join('\n');
        return `### ${type}\n\n${commits}`;
      });
      return `${header}\n\n${sections.join('\n\n')}`;
    });
    return `${title}\n\n${versionStrings.join('\n\n')}`;
  },
  { filename: 'CHANGELOG.md' },
);

```