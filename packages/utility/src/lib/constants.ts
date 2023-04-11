/**
 * See {@link https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string}.
 *
 * Their docs are out of date for JavaScript:
 * replacing `"?P<"` with `"?<"` in the Perl-compatible regex
 * results in the JavaScript-compatible regex (with capture groups)
 * below.
 */

export const semverRegex =
  /^(?<major>0|[1-9]\d*)\.(?<minor>0|[1-9]\d*)\.(?<patch>0|[1-9]\d*)(?:-(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+(?<buildmetadata>[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
export const prereleaseRegex =
  /(?<prerelease>(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)/;

export const versionBumpLevels = [
  'major',
  'minor',
  'patch',
  'premajor',
  'preminor',
  'prepatch',
  'prerelease',
] as const;
Object.freeze(versionBumpLevels);
