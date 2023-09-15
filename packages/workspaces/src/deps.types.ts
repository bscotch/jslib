export interface ManifestGraphOptions {
  /**
   * If `true`, the root manifest will be included in the graph.
   * @default false
   */
  includeRoot?: boolean;

  /**
   * If provided, dependencies of these types will not have links
   * made to them.
   * @default []
   */
  excludeDependencies?: (
    | 'dependencies'
    | 'devDependencies'
    | 'peerDependencies'
  )[];

  /**
   * If provided, local dependencies that match on any of these
   * protocols will not have links made to them.
   *
   * For example, if `excludeProtocols` is `['semver', 'file']` and `package-a` has deps `{"package-b": "1.0.0", "package-c": "file:../package-c", "package-d": "workspace:*"}`, and all of those are in the list of manifests, then the graph will have edges to `package-d` **but not to** `package-c` or `package-d`.
   *
   * @default []
   */
  excludeProtocols?: ('semver' | 'file' | 'workspace')[];
}

export interface PackageJson {
  name: string;
  version: string;
  description?: string;
  main?: string;
  types?: string;
  scripts?: { [key: string]: string };
  repository?: {
    type: string;
    url: string;
  };
  keywords?: string[];
  author?: string;
  license?: string;
  bugs?: {
    url: string;
  };
  homepage?: string;
  dependencies?: { [key: string]: string };
  devDependencies?: { [key: string]: string };
  peerDependencies?: { [key: string]: string };
  engines?: {
    node?: string;
    npm?: string;
  };
  private?: boolean;
  publishConfig?: {
    access?: 'public' | 'restricted';
  };
  [key: string]: unknown;
}

export interface ManifestInfo {
  /** Absolute path to this manifest file. */
  path: string;
  /** `true` if this was in the root of the search space when finding packages */
  isRoot: boolean;
  /** The `package.json` contents */
  package: PackageJson;
}

export interface ListManifestOptions {
  /**
   * Return objects containing parsed manifests and other metadata
   * instead of just the paths.
   */
  objectMode?: boolean;
}
