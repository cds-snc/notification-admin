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
        find: /\[([^\]]+)\]\(([^)]+)\)$/,
        handler: ({ state, range, match }) => {
          const { tr, schema } = state;
          const start = range.from;
          const end = range.to;
          const href = match[2];

          // Find the actual content between [ and ] in the document
          // This may have marks already applied (like variable marks)
          const $start = state.doc.resolve(start);
          const textStart = start + 1; // After the [
          const textEnd = start + 1 + match[1].length; // Before the ]

          // Get the slice of content that represents the link text
          const slice = state.doc.slice(textStart, textEnd);

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
