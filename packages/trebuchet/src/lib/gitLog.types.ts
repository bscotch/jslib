import { Readable } from '@bscotch/utility';
import type { DefaultLogFields, ListLogLine } from 'simple-git';

export interface GitVersionTagParsed {
  /** The whole tag */
  tag: string;
  /** The project name */
  name: string;
  /**
   * The scope part of the project name, if there is one
   *
   * @alpha Subject to change
   */
  scope?: string;
  /**
   * For a scoped project, the rest of the name (after the `/`). For an unscoped project, the name.
   *
   * @alpha Subject to change
   */
  unscoped: string;
  /**
   * The version part of the tag.
   */
  version: string;
}

/**
 * When using {@link GitLog.changeDescriptionPattern},
 * a match will result in this object.
 *
 * @example
 * 'type(scope): message'.match(GitLog.changeDescriptionPattern)?.groups // matches this interface
 */
export interface GitLogChangeDescriptionPatternGroups {
  type: string;
  scope?: string;
  breaking?: '!';
  title: string;
}

export interface GitLogData extends DefaultLogFields, ListLogLine {}

export type GitLogBump = 'major' | 'minor' | 'patch';

export interface GitLogChangeDescription {
  type: string;
  title: string;
  scope: string | undefined;
  body: string | undefined;
  breaking: boolean;
  bump: GitLogBump | undefined;
}

export interface GitLogChangeConfig<T extends string> {
  /**
   * Allowed change types.
   */
  types: Readable<T>;

  /**
   * Map of change types (e.g. `feat`, `fix`)
   * to the corresponding semver bump-types.
   */
  bump: {
    [Type in T]?: GitLogBump;
  };
}
