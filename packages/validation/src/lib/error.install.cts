/**
 * For use with `--require` when using Node with commonjs
 * modules. Causes the error prettifier to be loaded (async)
 */

import('./error.js').then((imported) => {
  imported.prettifyErrorTracing({
    replaceFilePaths: imported.replaceFilePaths,
  });
});
