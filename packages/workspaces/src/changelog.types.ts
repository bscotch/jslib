import type { GitLog } from './repo.types.js';

export interface ChangelogOptions {
  /**
   * Pattern(s) for testing sections of the git
   * message (a section is a block separated by a
   * blank line) to determine if the line is a
   * "header". Only one pattern needs to match.
   *
   * If no patterns are provided, the first line is
   * considered the header.
   *
   * If there are no headers found, the log is skipped.
   *
   * Sections following a header that aren't *also*
   * headers are considered "bodies" under the
   * prior header. A header and its bodies come
   * together to form a single "Change"
   */
  headerPatterns?: RegExp[];
  /**
   * Patterns with named capture groups for finding
   * variables in the header. The named capture
   * groups will be used as the keys in the
   * `variables` object in the `Change` object.
   */
  headerVariablePatterns?: RegExp[];

  /**
   * A pattern for finding version numbers in the
   * git log or tags. Upon match, the "version" part
   * of the match will be identified by the first of:
   * - From the named capture group `version`
   * - From the 1st capture group
   * - From the whole match
   * The version *MUST* be a valid semver string!
   */
  versionPattern: RegExp;
  /**
   * If `true`, the `versionPattern` will be tested against
   * the git message instead of the tags. If `false`, the
   * `versionPattern` will be tested against the tags.
   * @default false
   */
  versionIsInMessage?: boolean;

  /**
   * Patterns with named capture groups for finding
   * variables in body sections. The named capture
   * groups will be used as the keys in the
   * `variables` object in the `Change` object.
   */
  bodyVariablePatterns?: RegExp[];

  /**
   * Patterns with named capture groups for finding
   * variables in tags. The named capture
   * groups will be used as the keys in the
   * `variables` object in the `Change` object.
   */
  tagVariablePatterns?: RegExp[];
}

export interface Change<Vars extends Record<string, string[]>> {
  /** If this change also specifies a version, it'll be set here */
  version?: string;
  header: string;
  body: string[];
  variables: Vars;
  /** The log this Change was extracted from */
  log: GitLog;
}
