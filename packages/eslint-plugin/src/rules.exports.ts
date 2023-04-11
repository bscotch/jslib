import { TSESLint, TSESTree } from '@typescript-eslint/utils';
import { createRule } from './rules.lib.js';

type RuleMessageId = 'someMessageId';

const exportsRule = createRule({
  name: 'exports',
  meta: {
    docs: {
      description: 'Some rule or whatever',
      recommended: false,
      requiresTypeChecking: false,
    },
    messages: {} as Record<RuleMessageId, string>,
    schema: [],
    hasSuggestions: false,
    type: 'suggestion',
  },
  // @ts-expect-error
  defaultOptions: [] as any[],
  create(context: Readonly<TSESLint.RuleContext<RuleMessageId, never[]>>) {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PropertyDefinition: (node: TSESTree.Node) => {
        // TODO: Test the node
        const testPasses = true;

        if (!testPasses) {
          context.report({
            node: node,
            messageId: 'someMessageId',
          });
        }
      },
    };
  },
});

export default exportsRule;
