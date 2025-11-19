import { Node } from "@tiptap/core";

// Factory function to create language-specific nodes
const createLanguageNode = (language, langCode) => {
  return Node.create({
    name: `${language.toLowerCase()}Block`,

    // Allow this node to contain other content
    content: "block+",

    // This is a block-level node that can wrap other content
    group: "block",

    // Allow this node to be selected as a whole
    selectable: true,

    addOptions() {
      return {
        HTMLAttributes: {},
        language: language,
        langCode: langCode,
      };
    },

    parseHTML() {
      return [
        {
          tag: `div[lang="${langCode}"]`,
        },
        {
          tag: `div[data-lang="${language.toLowerCase()}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return [
        "div",
        {
          lang: langCode,
          "data-lang": language.toLowerCase(),
          "data-type": `${language.toLowerCase()}-block`,
          ...HTMLAttributes,
        },
        0,
      ];
    },

    addStorage() {
      return {
        // Custom markdown serialization and parsing to match our existing format, i.e.
        // [[en]]...[[/en]] and [[fr]]...[[/fr]] blocks
        markdown: {
          serialize(state, node) {
            state.write(`[[${langCode.toLowerCase().slice(0, 2)}]]\n`);
            state.renderContent(node);
            state.flushClose(1);
            state.write(`[[/${langCode.toLowerCase().slice(0, 2)}]]`);
            state.closeBlock(node);
          },
          parse: {
            setup(markdownit) {
              // Add a custom rule to parse [[en]] and [[fr]] blocks
              const langPrefix = langCode.toLowerCase().slice(0, 2);

              markdownit.use((md) => {
                md.block.ruler.before(
                  "paragraph",
                  `${langPrefix}_block`,
                  (state, start, end, silent) => {
                    const startMarker = `[[${langPrefix}]]`;
                    const endMarker = `[[/${langPrefix}]]`;

                    let pos = state.bMarks[start] + state.tShift[start];
                    let max = state.eMarks[start];

                    // Check if line starts with our marker
                    if (pos + startMarker.length > max) return false;
                    if (
                      state.src.slice(pos, pos + startMarker.length) !==
                      startMarker
                    )
                      return false;

                    pos += startMarker.length;
                    let firstLine = state.src.slice(pos, max).trim();

                    // Find the end marker
                    let nextLine = start + 1;
                    let autoClosed = false;

                    while (nextLine < end) {
                      pos = state.bMarks[nextLine] + state.tShift[nextLine];
                      max = state.eMarks[nextLine];

                      if (
                        pos < max &&
                        state.sCount[nextLine] < state.blkIndent
                      ) {
                        break;
                      }

                      if (
                        state.src.slice(pos, pos + endMarker.length) ===
                        endMarker
                      ) {
                        autoClosed = true;
                        break;
                      }

                      nextLine++;
                    }

                    if (!autoClosed) return false;

                    if (silent) return true;

                    let token = state.push(
                      `${langPrefix}_block_open`,
                      "div",
                      1,
                    );
                    token.markup = startMarker;
                    token.block = true;
                    token.info = "";
                    token.map = [start, nextLine];

                    // Parse content between markers
                    let contentStart = start + 1;
                    if (firstLine) {
                      // If there's content on the same line as opening marker
                      let contentToken = state.push("paragraph_open", "p", 1);
                      contentToken.map = [start, start + 1];

                      let inlineToken = state.push("inline", "", 0);
                      inlineToken.content = firstLine;
                      inlineToken.map = [start, start + 1];
                      inlineToken.children = [];

                      state.push("paragraph_close", "p", -1);
                    }

                    if (contentStart < nextLine) {
                      state.md.block.tokenize(state, contentStart, nextLine);
                    }

                    token = state.push(`${langPrefix}_block_close`, "div", -1);
                    token.markup = endMarker;
                    token.block = true;

                    state.line = nextLine + 1;
                    return true;
                  },
                );

                // Add renderer
                // TODO: come up with markup that allows screen readers to identify these custom blocks
                md.renderer.rules[`${langPrefix}_block_open`] = () => {
                  return `<div lang="${langCode}" data-lang="${language.toLowerCase()}" data-type="${language.toLowerCase()}-block">`;
                };
                md.renderer.rules[`${langPrefix}_block_close`] = () => {
                  return "</div>";
                };
              });
            },
          },
        },
      };
    },

    addCommands() {
      return {
        // Command to insert/add the language block (empty)
        [`set${language}Block`]:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
              content: [
                {
                  type: "paragraph",
                },
              ],
            });
          },

        // Command to wrap selection in language block
        [`wrapIn${language}Block`]:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.wrapIn(this.name, attributes);
          },

        // Command to toggle the language block (wrap if not present, unwrap if present)
        [`toggle${language}Block`]:
          (attributes = {}) =>
          ({ commands, editor }) => {
            // Use TipTap's built-in isActive method which is more reliable
            const isActive = editor.isActive(this.name);

            if (isActive) {
              // We're inside this language block, so unwrap it
              return commands.lift(this.name);
            } else {
              // Check if we're already inside ANY language block
              const isInsideEnglishBlock = editor.isActive("englishBlock");
              const isInsideFrenchBlock = editor.isActive("frenchBlock");

              if (isInsideEnglishBlock || isInsideFrenchBlock) {
                // Don't allow nesting language blocks - return false to indicate command failed
                return false;
              }

              // Not inside any language block, so wrap selection in one
              return commands.wrapIn(this.name, attributes);
            }
          },

        // Command to remove/unwrap the language block
        [`unset${language}Block`]:
          () =>
          ({ commands }) => {
            return commands.lift(this.name);
          },
      };
    },
  });
};

// Create the specific language node extensions
export const EnglishBlock = createLanguageNode("English", "en-CA");
export const FrenchBlock = createLanguageNode("French", "fr-CA");

// For backward compatibility, export English as default
export default EnglishBlock;
