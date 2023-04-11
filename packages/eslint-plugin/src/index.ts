// https://www.darraghoriordan.com/2021/11/06/how-to-write-an-eslint-plugin-typescript/

// const { ESLintUtils } = require('@typescript-eslint/utils');

// /**
//  * @typedef {import('@typescript-eslint/utils').Rule}
//  */

// /**
//  * @type {}
//  */
// module.exports = {
//   rules:
// }
import configs from './configs';
import rules from './rules';

const configuration = {
  rules,
  configs,
};

export = configuration;
