import { ManifestGitInfo } from './deps.types.js';
import { GitLog } from './repo.types.js';
import semver from 'semver';
import type {
  ChangelogOptions,
  Change,
  ConventionalCommitParserOptions,
  VersionSection,
  ConventionalCommitVar,
  ChangelogRenderFunction,
  VersionRenderOptions,
} from './changelog.types.js';
import { listRepoManifests } from './deps.js';
import {
  conventionalCommitsBodyPattern,
  conventionalCommitsHeaderPattern,
  isMatch,
  monorepoVersionPattern,
} from './utility.js';
import path from 'node:path';
import fsp from 'node:fs/promises';

export async function renderMonorepoConventionalCommits(
  projects: Map<ManifestGitInfo, VersionSection[]>,
  render: ChangelogRenderFunction,
  options?: VersionRenderOptions,
): Promise<Map<ManifestGitInfo, string | undefined>> {
  const rendered = new Map<ManifestGitInfo, string | undefined>();
  const waits: Promise<any>[] = [];
  for (const [project, versions] of projects) {
    waits.push(
      renderConventionalCommits(project, versions, render, options).then((r) =>
        rendered.set(project, r),
      ),
    );
  }
  await Promise.all(waits);
  return rendered;
}

/**
 * @returns The rendered changelog as a string (all rendered versions joined by a double-newline)
 */
export async function renderConventionalCommits(
  project: ManifestGitInfo,
  versions: VersionSection[],
  render: ChangelogRenderFunction,
  options?: VersionRenderOptions,
): Promise<string | undefined> {
  // Sort by descending version
  versions = [...versions].sort((a, b) =>
    semver.rcompare(a.version, b.version),
  );
  const rendered = render(project, versions);
  if (options?.filename && rendered) {
    const outfile = path.join(
      path.dirname(project.absolutePath),
      options.filename,
    );
    await fsp.writeFile(outfile, rendered);
  }

  return rendered;
}

export async function parseConventionalCommits(
  project: ManifestGitInfo,
  config: ConventionalCommitParserOptions,
): Promise<VersionSection[]> {
  const changelogs = generateStructuredChangelogs<ConventionalCommitVar>(
    project,
    {
      versionPattern: monorepoVersionPattern(project.package.name),
      headerPatterns: [conventionalCommitsHeaderPattern],
      headerVariablePatterns: [conventionalCommitsHeaderPattern],
      bodyVariablePatterns: [conventionalCommitsBodyPattern],
    },
  );

  // Group the changelogs by version and type
  const projectLogs: VersionSection[] = [];
  for (const log of changelogs) {
    const group = config.types.find((t) =>
      isMatch(log.variables.type[0], t.pattern),
    )?.group;
    if (!group) continue;

    const versionSection = projectLogs.find((v) => v.version === log.version);
    if (versionSection) {
      // Use the latest date in the group as the version's date
      versionSection.date =
        log.log.date > versionSection.date ? log.log.date : versionSection.date;
      versionSection.groups[group] ||= [];
      versionSection.groups[group].push(log);
    } else {
      projectLogs.push({
        version: log.version,
        date: log.log.date,
        groups: {
          [group]: [log],
        },
      });
    }
  }
  return projectLogs;
}

export async function parseMonorepoConventionalCommits(
  cwd = process.cwd(),
  options: ConventionalCommitParserOptions,
): Promise<Map<ManifestGitInfo, VersionSection[]>> {
  const projects = await listRepoManifests(cwd);
  const projectsChangelogs = new Map<ManifestGitInfo, VersionSection[]>();
  const waits: Promise<any>[] = [];
  for (const project of projects) {
    waits.push(
      parseConventionalCommits(project, options).then((changelogs) => {
        projectsChangelogs.set(project, changelogs);
      }),
    );
  }
  await Promise.all(waits);
  return projectsChangelogs;
}

export function generateStructuredChangelogs<Vars extends string>(
  project: ManifestGitInfo,
  options: ChangelogOptions,
): Change<Vars>[] {
  const logs = project.logs;
  const changes: Change<Vars>[] = [];

  // Assuming the logs are in reverse chronological/topo order,
  // we call the version "undefined" until we find the first version.
  // Then that version applies until we find the next one.
  let version: string | undefined;

  // Since the version may be set in the tags or the message, and
  // depending on workflow the tags may appear later, we want to grab
  // the current version from the manifest. If it's gt the first version
  // we find from parsing, then we'll assume that it's a valid version change.
  let firstParsedVersion: string | undefined;
  for (const log of logs) {
    firstParsedVersion = findVersionInLog(
      log,
      options.versionPattern,
      options.versionIsInMessage,
    );
    if (!firstParsedVersion) continue;
    if (semver.gt(project.package.version, firstParsedVersion)) {
      version = project.package.version;
    }
    break;
  }

  if (!firstParsedVersion) {
    // Then this hasn't been published at all. Just use the manifest
    // version. We can't tell if this version is "done", but it doesn't
    // matter since it's completely unpublished.
    version = project.package.version;
  }

  // Then build the changelogs
  for (const log of logs) {
    // See if we're in a new version now
    const newVersion = findVersionInLog(
      log,
      options.versionPattern,
      options.versionIsInMessage,
    );
    // If we found a new version it should be LOWER than the previous version
    if (newVersion && (!version || semver.lt(newVersion, version))) {
      version = newVersion;
    }

    // If we don't have a version yet, then we're in UNRELEASED commits!
    if (!version) continue;

    // Find variables in the tags
    const tagVariables: Record<string, string[]> = {};
    for (const pattern of options.tagVariablePatterns || []) {
      for (const tag of log.tags) {
        const match = tag.match(pattern);
        if (match) {
          for (const [key, value] of Object.entries(match.groups || {})) {
            tagVariables[key] = tagVariables[key] || [];
            tagVariables[key].push(value);
          }
        }
      }
    }

    // Find the distinct "Changes" by finding the headers
    const lines = log.body.split(/(?:\r?\n){2,}/g);
    const changesInLog: Change<Vars>[] = [];
    if (!options.headerPatterns?.length) {
      // Then the first line is the header and the rest is the body
      changesInLog.push({
        version,
        header: lines[0],
        body: lines.slice(1),
        variables: {} as any, // Will be added later
        log,
      });
    } else {
      // Then we may have multiple changes in this log. We'll need to find the headers
      let currentChange: Change<Vars> | undefined;
      for (const line of lines) {
        let headerMatch;
        for (const pattern of options.headerPatterns || []) {
          headerMatch = line.match(pattern);
          if (!headerMatch) continue;
          currentChange = {
            version,
            header: line,
            body: [],
            variables: {} as any, // Will be added later
            log,
          };
          changesInLog.push(currentChange);
          break;
        }
        // If we didn't find a header, then this line is part of the body.
        currentChange?.body.push(line);
      }
    }

    // For each change, find the variables
    for (const change of changesInLog) {
      change.variables = { ...tagVariables, ...change.variables };
      const searches: [strings: string[], patterns: RegExp[]][] = [
        [[change.header], options.headerVariablePatterns || []],
        [change.body, options.bodyVariablePatterns || []],
      ];
      for (const [strings, patterns] of searches) {
        for (const string of strings) {
          for (const pattern of patterns) {
            const match = string.match(pattern);
            if (match) {
              for (const [key, value] of Object.entries(match.groups || {})) {
                if (!value) continue;
                // @ts-expect-error Generic type is too complex to infer
                change.variables[key] = change.variables[key] || [];
                // @ts-expect-error Generic type is too complex to infer
                change.variables[key].push(value);
              }
            }
          }
        }
      }
    }

    changes.push(...changesInLog);
  }
  return changes;
}

function findVersionInLog(
  log: GitLog,
  versionPattern: RegExp,
  versionIsInMessage?: boolean,
): string | undefined {
  let version: string | undefined;
  for (const possibleVersionLocation of versionIsInMessage
    ? [log.body]
    : log.tags) {
    const match = possibleVersionLocation.match(versionPattern);
    if (match) {
      const versionMatch = (match.groups?.version || match[1] || match[0]) as
        | string
        | undefined;
      if (versionMatch && semver.valid(versionMatch)) {
        version = versionMatch;
        break;
      }
    }
  }
  return version;
}
