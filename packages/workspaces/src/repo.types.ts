export interface GitLogAuthor {
  name: string;
  email: string;
}

export interface GitLog {
  author: GitLogAuthor;
  date: Date;
  body: string;
  hash: string;
  tags: string[];
  /** Paths of files affected by this commit, relative to the repo root */
  affected: string[];
}
