/**
 * For use with `--require` when using Node with ESM
 * modules. Causes the error prettifier to be loaded
 */

import { prettifyErrorTracing, replaceFilePaths } from './error.js';

prettifyErrorTracing({
  replaceFilePaths: replaceFilePaths,
});
