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

            // Ensure empty blockquotes contain a paragraph so the resulting
            // token stream always has block content for ProseMirror.
            if (!markdownit.__notify_ensure_blockquote_paragraph) {
              markdownit.__notify_ensure_blockquote_paragraph = true;

              markdownit.core.ruler.push(
                "notify_ensure_blockquote_paragraph",
                function (state) {
                  const Token = state.Token;
                  const tokens = state.tokens;

                  for (let i = 0; i < tokens.length; i++) {
                    if (tokens[i].type === "blockquote_open") {
                      // find matching close
                      let j = i + 1;
                      while (
                        j < tokens.length &&
                        tokens[j].type !== "blockquote_close"
                      )
                        j++;

                      // check for any paragraph_open between open and close
                      let hasParagraph = false;
                      for (let k = i + 1; k < j; k++) {
                        if (tokens[k].type === "paragraph_open") {
                          hasParagraph = true;
                          break;
                        }
                      }

                      if (!hasParagraph) {
                        // insert paragraph_open, inline (empty), paragraph_close before the blockquote_close
                        const pOpen = new Token("paragraph_open", "p", 1);
                        const inline = new Token("inline", "", 0);
                        inline.content = "";
                        inline.children = [];
                        const pClose = new Token("paragraph_close", "p", -1);

                        tokens.splice(j, 0, pOpen, inline, pClose);

                        // advance i past inserted tokens
                        i = j + 2;
                      }
                    }
                  }
                },
              );
            }
          },
        },
      },
    };
  },
  // Note: no input rules here; previous attempt caused runtime errors
  // in the bundled TipTap runtime. We keep only the markdown-it pre
  // processing rule that treats '^' as a blockquote marker on parse.
  addInputRules() {
    const blockquoteType = this.editor?.schema?.nodes?.blockquote;
    if (!blockquoteType) {
      return [];
    }

    // Use wrappingInputRule so typing '^ ' produces a real blockquote node
    // exactly the same way typing '> ' would.
    return [
      wrappingInputRule({
        // Match optional leading whitespace followed by '^ ' at start of block
        find: /^\s*\^\s$/,
        type: blockquoteType,
      }),
    ];
  },
});
