import Link from "@tiptap/extension-link";
import { InputRule } from "@tiptap/core";

/**
 * Extended Link that supports markdown syntax input
 * Converts [text](url) to a proper link as you type
 */
const MarkdownLink = Link.extend({
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

          // Find the actual content between [ and ] in the document
          // This may have marks already applied (like variable marks)
          const textStart = start + 1; // After the [
          const textEnd = start + 1 + match[1].length; // Before the ]

          // Get the slice of content that represents the link text
          const slice = state.doc.slice(textStart, textEnd);

          // The regex matched on input text, but VariableMark may have already
          // converted ((var)) into a marked node. So the document structure has changed.
          // We need to examine the slice of content between the parens to find marks.
          try {
            const fullText = state.doc.textBetween(start, end, "", "");
            const firstOpen = fullText.indexOf("(");

            // Instead of looking for lastClose in text, use the range.to which is the
            // end of the matched markdown syntax
            if (firstOpen !== -1) {
              // The URL content is between firstOpen+1 and the end of the match
              const urlStart = start + firstOpen + 1;
              const urlEnd = end;

              // Get the slice between the parens
              const urlSlice = state.doc.slice(urlStart, urlEnd);

              const variableMark = state.schema.marks.variable;

              const parts = [];

              // Iterate through the nodes in the slice
              urlSlice.content.forEach((node) => {
                if (node.isText) {
                  const hasVarMark =
                    variableMark &&
                    node.marks &&
                    node.marks.some((m) => m.type === variableMark);

                  if (hasVarMark) {
                    parts.push("((" + node.text + "))");
                  } else {
                    parts.push(node.text);
                  }
                }
              });

              const reconstructed = parts.join("");

              // Only apply the rule if parens are balanced in the reconstructed href
              const urlOpenParens = (reconstructed.match(/\(/g) || []).length;
              const urlCloseParens = (reconstructed.match(/\)/g) || []).length;

              if (urlOpenParens !== urlCloseParens) {
                return;
              }

              href = reconstructed;
            }
          } catch (e) {
            // If anything goes wrong, fall back to the original href
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
