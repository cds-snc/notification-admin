import { LexicalNode } from "lexical";
import type { ElementTransformer } from '@lexical/markdown/MarkdownTransformers';
import {
    $createHorizontalRuleNode,
    $isHorizontalRuleNode,
    HorizontalRuleNode,
} from '@lexical/react/LexicalHorizontalRuleNode';
import { TRANSFORMERS as TRANSFORMERS_MD } from "@lexical/markdown";

const HR: ElementTransformer = {
    dependencies: [HorizontalRuleNode],
    export: (node: LexicalNode) => {
        return $isHorizontalRuleNode(node) ? '***' : null;
    },
    regExp: /^(---|\*\*\*|___)\s?$/,
    replace: (parentNode, _1, _2, isImport) => {
        const line = $createHorizontalRuleNode();

        // TODO: Get rid of isImport flag
        if (isImport || parentNode.getNextSibling() != null) {
        parentNode.replace(line);
        } else {
        parentNode.insertBefore(line);
        }

        line.selectNext();
    },
    type: 'element',
};
  
const TRANSFORMERS = [...TRANSFORMERS_MD, HR];

export default TRANSFORMERS;
