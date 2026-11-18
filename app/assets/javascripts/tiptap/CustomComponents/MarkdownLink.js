import Link from "@tiptap/extension-link";
import { InputRule } from "@tiptap/core";

/**
 * Extended Link that supports markdown syntax input
 * Converts [text](url) to a proper link as you type
 */
const MarkdownLink = Link.extend({
  inclusive() {
    return false;
  },
  addInputRules() {
    return [
      new InputRule({
        find: /\[([^\]]+)\]\((.+)\)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          let href = match[2];

          // Only apply the input rule when parentheses in the href are
          // balanced. While the user is still typing (unbalanced parens),
          // skip conversion so we don't prematurely close the link.
          const openParens = (href.match(/\(/g) || []).length;
          const closeParens = (href.match(/\)/g) || []).length;
          if (openParens !== closeParens) {
            // Skip conversion for now; let the user finish typing.
            return;
          }

          // Use the matched input to find the Markdown delimiters. It includes
          // the character that triggered the rule, which is not yet in the doc.
          // VariableMark may already have replaced ((name)) with marked text,
          // so offsets within this match reflect the editor's current text.
          const fullText = match[0];
          const closingBracket = fullText.indexOf("]");
          if (closingBracket === -1) return;

          // Slice the link text from the document to preserve existing marks,
          // including variables that were converted before this rule ran.
          const textStart = start + 1;
          const textEnd = start + closingBracket;
          const slice = state.doc.slice(textStart, textEnd);

          // Find the destination's matching closing parenthesis. Variables in
          // URLs use nested parentheses, so the first ')' is not the delimiter.
          const openingParen = fullText.indexOf("(", closingBracket + 1);
          if (openingParen !== -1) {
            let depth = 0;
            let closingParen = -1;
            for (let i = openingParen; i < fullText.length; i++) {
              if (fullText[i] === "(") {
                depth++;
              } else if (fullText[i] === ")") {
                depth--;
                if (depth === 0) {
                  closingParen = i;
                  break;
                }
              }
            }

            if (closingParen === -1) return;

            const urlStart = start + openingParen + 1;
            const urlEnd = start + closingParen;
            const urlSlice = state.doc.slice(urlStart, urlEnd);

            // Variable marks hold only the variable name; restore its template
            // delimiters while rebuilding the href from the document slice.
            const variableMark = state.schema.marks.variable;
            const parts = [];

            urlSlice.content.forEach((node) => {
              if (!node.isText) return;

              const hasVarMark =
                variableMark &&
                node.marks &&
                node.marks.some((mark) => mark.type === variableMark);

              parts.push(hasVarMark ? `((${node.text}))` : node.text);
            });

            const reconstructed = parts.join("");
            // Only create the link once the reconstructed destination is complete.
            const urlOpenParens = (reconstructed.match(/\(/g) || []).length;
            const urlCloseParens = (reconstructed.match(/\)/g) || []).length;

            if (urlOpenParens !== urlCloseParens) return;

            href = reconstructed;
          }

          // Delete the entire markdown syntax [text](url)
          tr.delete(start, end);

          // Insert the slice content back (preserving any marks like variables)
          tr.insert(start, slice.content);

          // Add the link mark to the inserted content
          const linkMark = this.type.create({ href });
          tr.addMark(start, start + slice.content.size, linkMark);
        },
      }),
    ];
  },
});

export default MarkdownLink;
