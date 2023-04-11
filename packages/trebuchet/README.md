# Trebuchet

A collection of command-line (CLI) and programmatic tools for managing a Typescript monorepo.

## Features

- 🤖 Package manifests kept up to date with dependency listings based on your actual code
- 🕸 Dependency graph computed based on your code
- 🧪 Built-in testing via Mocha, so you don't have to provide any boilerplate
- ✈ Automatic versioning and publishing based on the dependency graph
- 📦 Dead-simple dependency management (versions kept in sync across all projects, and only installed to the root)
- 🏗 Commands for creating, moving, importing, and renaming projects all while keeping imports up to date
- ☕ Command for splitting one project into multiple projects

## Installation

Local: `npm i @bscotch/trebuchet`

Global: `npm i -g @bscotch/trebuchet`

## Commands

Local: `npx treb --help`

Global: `treb --help`

## Initial Setup

Trebuchet assumes that your monorepo:

- Has a root `package.json` file containing [a `workspaces` field](https://docs.npmjs.com/cli/v8/using-npm/workspaces)
- Has a collection of projects matching the paths/globs in that `workspaces` field, each with a root `package.json` file

Trebuchet also assumes that each project in your monorepo:

- Is a Typescript project (not strictly required for all functionality, but required for most)
- Has a project-root `tsconfig.json` file that accurately represents how your project is compiled

Assuming all of that is true, you're already set!

## Pairs Well With...

Trebuchet strives to be (relatively) unopinionated and to use patterns that are compatible with other popular tools, so that you can use its features _a la carte_ without getting locked in.

The following is a feature-based listing of what you may want to use Trebuchet vs. other tools for:

- **Versioning:** Trebuchet follows [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)-style git-log-based automatic versioning. It's default bump patterns and commit types are custom, however. Alternatives include Conventional Commits, [Lerna](https://lerna.js.org/), and [ChangeSets](https://github.com/changesets/changesets).
- **Publishing:** Trebuchet simply uses `npm` for publishing, coupled to the versioning process. You can set per-project `publish` and `prepublish` scripts (etc) as usual. Alternatives include Lerna and ChangeSets, though those mostly do the same thing.
- **Code Management:** For bleeding-edge Typescript projects, Trebuchet provides tools to manage your code at the project-level. Other code-mod features will have to be found elsewhere, likely in one-off CLI tools. [Nx](https://nx.dev/) is an option for advanced codemod and project templating, though it has a lot of opinions and requires a lot of boilerplate to use.
- **Changelogs:** Trebuchet _does not_ currently generate Changelogs, thought that's on the short side of the roadmap. For that use ChangeSets or Conventional Commits (or tools that use them under the hood).
- **Task Management:** Trebuchet _does not_ put any effort into task management (e.g. scheduling and caching builds), and has no intention to. Other projects like [Turborepo](https://turborepo.org/), Nx, and Lerna already focus on this and do it reasonably well. Trebuchet is developed using Turborepo and may make some assumptions here and there that that is what you're using for task management, though it tries to be agnostic.

## Examples

```sh
# List all projects
treb list

# List publishable projects
treb list --publishable

# Fix import statements to include extensions
# and to sync the package.json depenencies with
# what is actually imported by the project.
treb fix --importPaths --packageJson

# Run a project's tests
treb test

# Publish all changed projects
# (includes automatic version bump based on git commits)
treb publish
```
