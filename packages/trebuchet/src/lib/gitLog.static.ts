import { Pathy, PathyOrString } from '@bscotch/pathy';
import {
  ArrayOrSingleton,
  arrayWithoutNullish,
  arrayWrapped,
  PartialBy,
} from '@bscotch/utility';
import { default as semver } from 'semver';
import type {
  DiffResult,
  DiffResultBinaryFile,
  DiffResultTextFile,
} from 'simple-git';
import { GitLog } from './gitLog.js';
import {
  GitLogBump,
  GitLogChangeDescription,
  GitLogChangeDescriptionPatternGroups,
  GitVersionTagParsed,
} from './gitLog.types.js';

interface GitLogChangeType {
  name: string;
  labels: string[];
  icon: string;
  description: string;
  bump?: GitLogBump;
}

const defaultGitLogChangeTypes: GitLogChangeType[] = [
  {
    name: 'feature',
    labels: ['feature', 'feat', '✨', '🆕'],
    icon: '🆕',
    description: 'A new feature.',
    bump: 'minor',
  },
  {
    name: 'change',
    labels: ['alt', 'alteration', 'change', 'breaking', '🧨', '💣'],
    icon: '💣',
    description: 'A change to an existing feature, likely breaking dependents.',
    bump: 'major',
  },
  {
    name: 'bugfix',
    labels: [
      'fix',
      'bug',
      'bugfix',
      'issue',
      '🐛',
      '🐞',
      '🧯',
      '🚒',
      '⚕',
      '💉',
      '🩹',
    ],
    icon: '🐞',
    description: 'Resolution of an issue.',
    bump: 'patch',
  },
  {
    name: 'testing',
    labels: ['test', 'testing', 'tests', '🧪'],
    icon: '🧪',
    description:
      'A change to the test suite or other testing infrastructure. Assumed to not impact functionality of deployed content.',
  },
  {
    name: 'documentation',
    labels: ['docs', 'doc', 'documentation', '📚', '📙', '📃', '📜', '📄'],
    icon: '📚',
    description:
      'A change to the documentation. Expected to be deployed as a patch bump so that consumers have up-to-date docs.',
    bump: 'patch',
  },
  {
    name: 'security',
    labels: ['security', '🔒', '🔐'],
    icon: '🔒',
    description: 'A change impacting security and/or privacy.',
    bump: 'patch',
  },
  {
    name: 'meta',
    labels: ['meta', 'chore', 'refactor', 'config', '🥱', '💤'],
    icon: '💤',
    description:
      'A change that does not impact functionality of deployed content, such as tidying, refactors, minor documentation fixes, repo configuration, etc.',
  },
  {
    name: 'partial',
    labels: ['partial', 'incomplete', '🙈', '🔥'],
    icon: '🔥',
    description:
      'An incomplete project state that likely does not pass tests. Should really only happen on non-trunk branches.',
  },
  {
    name: 'build',
    labels: ['build', 'ci', '🔧', '🔨', '🏗'],
    icon: '🔨',
    description:
      'A change to the build system, CI infrastructure, or similar. Assumed to not impact functionality of deployed content.',
  },
  {
    name: 'performance',
    labels: ['performance', 'perf', '🚀'],
    icon: '🚀',
    description:
      'A change that improves deployed content performance but does not introduce new features.',
    bump: 'patch',
  },
];

/**
 * When trying to understand whether or not a given file has
 * changed, we often filter git logs by the *current* file path.
 * But since the file path may have changed, we also need to keep
 * track of renames so that we can also discover changes to the
 * file when it had a different name.
 */
export class GitLogAffectedFile extends Pathy {
  readonly renamedFrom?: Pathy;

  constructor(
    readonly diff: DiffResultTextFile | DiffResultBinaryFile,
    cwd: PathyOrString,
  ) {
    // The path could include a RENAME action, which we want to
    // keep track of.
    let logPath = diff.file;
    const renamePattern = /\{(?<oldName>.*?) => (?<newName>[^}]+)\}/;
    const renameMatch = logPath.match(renamePattern);
    let oldName: string | undefined;
    if (renameMatch) {
      oldName = logPath.replace(renamePattern, '$1');
      logPath = logPath.replace(renamePattern, '$2');
    }
    super(logPath, cwd);
    if (oldName) {
      this.renamedFrom = new Pathy(oldName, cwd);
    }
  }
}

/**
 * Collection of static methods used by the
 * {@link GitLog} class.
 */
export class GitLogStatic {
  static readonly changeDescriptionPattern =
    /^(?<type>[^\s:(!]+)(\(\s*(?<scope>[^)]*)\s*\))?(?<breaking>!)?: (?<title>.+)/su;

  static readonly projectVersionTagPattern =
    /^(?<tag>(?<name>(?<scope>@[^@]+\/)?(?<unscoped>[^@]+))(@(?<version>[^@]+))?)$/;

  /**
   * Bump types, in ascending order of precedence.
   */
  static readonly bumpTypes = ['patch', 'minor', 'major'] as const;

  static readonly changeDescriptionConfig = defaultGitLogChangeTypes;

  /**
   * Parse a tag into its semantic components, if
   * possible.
   */
  static parseTag(
    tag: string,
  ): PartialBy<GitVersionTagParsed, 'version'> | undefined {
    return tag.match(GitLog.projectVersionTagPattern)?.groups as
      | GitVersionTagParsed
      | undefined;
  }

  static parsedTagIsProjectVersion(tag: any): tag is GitVersionTagParsed {
    return !!(tag && tag.version && semver.valid(tag.version));
  }

  /**
   * Convert the SimpleGit `refs` string into
   * an array of tags.
   */
  static rawRefsToTagArray(refsString: string): string[] {
    if (!refsString) {
      return [];
    }
    const rawTagPattern = /\btag: (?<tag>[^\s,]+)/;
    return (
      (refsString
        .match(new RegExp(rawTagPattern, 'g'))
        ?.map((rawTag) => rawTag.match(rawTagPattern)?.groups?.tag)
        .filter((x) => x) as string[]) || []
    );
  }

  static tagsToParsedProjectVersions(tags: string[]): GitVersionTagParsed[] {
    return arrayWithoutNullish(tags.map(GitLog.tagToParsedProjectVersion));
  }

  /**
   * Get a parsed project version tag from
   * a raw tag, if possible (else returns `undefined`).
   */
  static tagToParsedProjectVersion(
    tag: string,
  ): GitVersionTagParsed | undefined {
    const parsed = tag && GitLog.parseTag(tag);
    return parsed && GitLog.parsedTagIsProjectVersion(parsed)
      ? parsed
      : undefined;
  }

  static affectedFiles(
    diff?: DiffResult,
    root: PathyOrString = process.cwd(),
  ): GitLogAffectedFile[] {
    return (
      diff?.files.map(
        (file) =>
          // Moved files show up as `./path/{from => to}/etc.ext`
          new GitLogAffectedFile(file, root),
      ) || []
    );
  }

  /**
   * Convert a parsed git log message,
   * originally consisting of the `message`
   * (the first line) and an optional `body`
   * (everything after the first line and
   * a blank line), into a semantic change
   * description.
   *
   * Can convert back and forth using
   * {@link serializeMessage}, though some
   * minor details of the original text may be lost.
   */
  static parseMessage(
    message: string,
    changeConfig: GitLogChangeType[] = GitLog.changeDescriptionConfig,
  ): GitLogChangeDescription[] {
    const descriptions: GitLogChangeDescription[] = [];
    const paragraphs = message.trim().split(/(?:\r?\n){2,}/g);
    for (const paragraph of paragraphs) {
      const header = paragraph.match(GitLog.changeDescriptionPattern)
        ?.groups as GitLogChangeDescriptionPatternGroups | undefined;
      if (header) {
        const config = changeConfig.find((config) =>
          config.labels.includes(header.type),
        );
        descriptions.push({
          title: header.title,
          type: header.type,
          scope: header.scope,
          breaking: !!header.breaking,
          bump: header.breaking ? 'major' : config?.bump,
          body: undefined,
        });
        continue;
      }
      const lastDescription = descriptions.at(-1);
      if (!lastDescription) {
        continue;
      }
      lastDescription.body = `${
        lastDescription.body ? `${lastDescription.body}\n\n` : ''
      }${paragraph}`;
    }
    return descriptions;
  }

  static serializeParsedMessage(
    descriptions: ArrayOrSingleton<GitLogChangeDescription>,
  ) {
    return arrayWrapped(descriptions)
      .map((description) => {
        const { type, scope, breaking, title, body } = description;
        return `${type}${scope ? `(${scope})` : ''}${
          breaking ? '!' : ''
        }: ${title}${body ? `\n\n${body}` : ''}`;
      })
      .join('\n\n');
  }

  static maxBump(
    bumpers: (GitLogBump | GitLogChangeDescription | GitLog | undefined)[],
  ): GitLogBump | undefined {
    const bumps = bumpers.map((b) => (typeof b === 'string' ? b : b?.bump));
    const maxPossibleBump = GitLog.bumpTypes.at(-1);
    let maxBump = bumps[0];
    for (let i = 1; i < bumps.length; i++) {
      if (maxBump === maxPossibleBump) {
        return maxPossibleBump;
      }
      const bump = bumps[i];
      if (bump === undefined) {
        continue;
      }
      if (maxBump === undefined) {
        maxBump = bumps[i];
        continue;
      }
      if (GitLog.bumpTypes.indexOf(bump) > GitLog.bumpTypes.indexOf(maxBump)) {
        maxBump = bump;
      }
    }
    return maxBump;
  }
}
