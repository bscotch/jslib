import { ESLintUtils } from '@typescript-eslint/utils';

export const createRule = ESLintUtils.RuleCreator(
  () =>
    `https://github.com/bscotch/tech/blob/develop/lib/eslint-plugin/README.md`,
);
