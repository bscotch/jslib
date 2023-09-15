import { ok } from 'assert';
import { ManifestGitInfo } from './deps.types.js';
import { GitLog } from './repo.types.js';
import semver from 'semver';
import type { ChangelogOptions, Change } from './changelog.types.js';

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

export function generateChangelogs<Vars extends Record<string, string[]>>(
  project: ManifestGitInfo,
  options: ChangelogOptions,
): Change<Vars>[] {
  const logs = project.logs;
  const changes: Change<Vars>[] = [];
  // Assuming the logs are in reverse chronological/topo order,
  // we want to work backwards to properly set versions
  // First, find the first version in the logs
  let version: string | undefined;
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];
    version = findVersionInLog(
      log,
      options.versionPattern,
      options.versionIsInMessage,
    );
    if (version) break;
  }
  // If there were no versions found, use the manifest version
  version ||= project.package.version;
  ok(version, `No version found for ${project.package.name}`);

  // Then build the changelogs
  for (let i = logs.length - 1; i >= 0; i--) {
    const log = logs[i];

    // Update the version if necessary
    const newVersion = findVersionInLog(
      log,
      options.versionPattern,
      options.versionIsInMessage,
    );
    if (newVersion && semver.gte(newVersion, version)) {
      version = newVersion;
    }

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
