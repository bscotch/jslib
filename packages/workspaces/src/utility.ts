export function normalizePath(path: string) {
  return path.replace(/\\+/g, '/').replace(/\/$/, '');
}

export function getDirectory(path: string) {
  const pathParts = normalizePath(path).split('/');
  if (pathParts.length === 1) {
    // e.g. "package.json"
    return '';
  }
  return normalizePath(path).split('/').slice(0, -1).join('/');
}
