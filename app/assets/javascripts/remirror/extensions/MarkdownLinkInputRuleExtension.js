import { PlainExtension } from 'remirror';
import { InputRule } from '@remirror/pm/inputrules';
import { TextSelection } from '@remirror/pm/state';

export class MarkdownLinkInputRuleExtension extends PlainExtension {
  get name() {
    return 'markdownLinkInputRule';
  }

  createInputRules() {
    const pattern = /\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)$/;

    return [
      new InputRule(pattern, (state, match, start, end) => {
        const [, label, href] = match ?? [];
        const linkType = state.schema.marks.link;

        if (!label || !href || !linkType) {
          return null;
        }

        const mark = linkType.create({ href });
        const textNode = state.schema.text(label, [mark]);
        const tr = state.tr.replaceWith(start, end, textNode);
        return tr.setSelection(TextSelection.create(tr.doc, start + label.length));
      }),
    ];
  }
}