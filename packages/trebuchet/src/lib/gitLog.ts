import { PathyOrString } from '@bscotch/pathy';
import { ok } from 'assert';
import { GitLogAffectedFile, GitLogStatic } from './gitLog.static.js';
import {
  GitLogChangeDescription,
  GitLogData,
  GitVersionTagParsed,
} from './gitLog.types.js';

export * from './gitLog.static.js';
export * from './gitLog.types.js';

export class GitLog extends GitLogStatic {
  readonly tags: string[];
  readonly projectVersionTags: GitVersionTagParsed[];
  readonly date: Date;
  readonly files: GitLogAffectedFile[];

  readonly changes: GitLogChangeDescription[];

  constructor(
    protected raw: GitLogData,
    repoRoot: PathyOrString = process.cwd(),
  ) {
    super();
    this.date = new Date(raw.date);

    this.tags = GitLog.rawRefsToTagArray(raw.refs);
    this.projectVersionTags = GitLog.tagsToParsedProjectVersions(this.tags);
    this.files = GitLog.affectedFiles(raw.diff, repoRoot);
    this.changes = GitLog.parseMessage(`${raw.message}\n\n${raw.body}`);
  }

  get hash() {
    return this.raw.hash;
  }

  get bump() {
    return GitLog.maxBump(this.changes);
  }

  /**
   * Check if this commit is tagged with a project
   * version tag. If the `projectName` includes a
   * version, then the tag on this commits must also
   * have that version. If not, *any* version tag
   * matching the project will return true.
   *
   * @example
   * const log = new GitLog({
   *  refs: 'tag: @bscotch/utility@3.0.0',
   *  // ... other required fields
   * });
   * log.hasProjectVersionTag('@bscotch/utility') // true
   * log.hasProjectVersionTag('@bscotch/utility@3.0.0') // true
   * log.hasProjectVersionTag('@bscotch/utility@1.1.1') // false
   */
  hasProjectVersionTag(projectName: string) {
    const parsedProjectName = GitLog.parseTag(projectName);
    ok(
      parsedProjectName,
      'projectName must be a valid project tag (version suffix optional)',
    );
    return this.projectVersionTags.some((tag) => {
      return (
        tag.name === parsedProjectName.name &&
        (!parsedProjectName.version ||
          tag.version === parsedProjectName.version)
      );
    });
  }
}
