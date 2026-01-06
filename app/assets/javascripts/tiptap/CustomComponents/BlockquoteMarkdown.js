import { Extension, wrappingInputRule } from "@tiptap/core";

// Extension that ensures inbound markdown containing '^' as a blockquote
// marker is interpreted as a blockquote by markdown-it. We do a simple
// pre-processing step inside markdown-it's core ruler to rewrite leading
// '^' to '>' before the parser runs. Outbound serialization to emit '^'
// is handled centrally in the editor by post-processing markdown output.
export default Extension.create({
  name: "blockquoteMarkdown",

  addStorage() {
    return {
      markdown: {
        parse: {
          setup(markdownit) {
            // Preprocess source text so lines that start with '^' are
            // treated as blockquotes by the existing blockquote rule.
            markdownit.core.ruler.push(
              "caret_blockquote_transform",
              function (state) {
                if (state && typeof state.src === "string") {
                  state.src = state.src.replace(/^(\s*)\^/gm, "$1>");
                }
              },
            );
          },
        },
      },
    };
  },
  // Note: no input rules here; previous attempt caused runtime errors
  // in the bundled TipTap runtime. We keep only the markdown-it pre
  // processing rule that treats '^' as a blockquote marker on parse.
  addInputRules() {
    // Use wrappingInputRule so typing '^ ' produces a real blockquote node
    // exactly the same way typing '> ' would.
    return [
      wrappingInputRule({
        // Match optional leading whitespace followed by '^ ' at start of block
        find: /^\s*\^\s$/,
        type: this.editor?.schema?.nodes?.blockquote,
      }),
    ];
  },
});
