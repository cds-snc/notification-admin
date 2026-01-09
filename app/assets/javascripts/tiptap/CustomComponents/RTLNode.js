import { Node, wrappingInputRule } from "@tiptap/core";

// Simple RTL block node that wraps content in a <div dir="rtl">.
// Minimal commands: setRtlBlock, wrapInRtlBlock, toggleRtlBlock, unsetRtlBlock.
const createRtlNode = () =>
  Node.create({
    name: "rtlBlock",

    group: "block",
    content: "block+",
    selectable: true,

    addInputRules() {
      // Allow typing [[rtl]] on its own line to wrap following content
      return [
        wrappingInputRule({
          find: /^\[\[rtl\]\]$/,
          type: this.type,
        }),
      ];
    },

    addStorage() {
      return {
        markdown: {
          serialize(state, node) {
            state.write(`[[rtl]]\n`);
            state.renderContent(node);
            state.flushClose(1);
            state.write(`[[/rtl]]`);
            state.closeBlock(node);
          },
          parse: {
            setup(markdownit) {
              markdownit.use((md) => {
                md.block.ruler.before(
                  "paragraph",
                  "rtl_block",
                  (state, start, end, silent) => {
                    const startMarker = "[[rtl]]";
                    const endMarker = "[[/rtl]]";

                    let pos = state.bMarks[start] + state.tShift[start];
                    let max = state.eMarks[start];

                    if (pos + startMarker.length > max) return false;
                    if (state.src.slice(pos, pos + startMarker.length) !== startMarker) return false;

                    pos += startMarker.length;
                    let firstLine = state.src.slice(pos, max).trim();

                    let nextLine = start + 1;
                    let autoClosed = false;

                    while (nextLine < end) {
                      pos = state.bMarks[nextLine] + state.tShift[nextLine];
                      max = state.eMarks[nextLine];

                      if (pos < max && state.sCount[nextLine] < state.blkIndent) {
                        break;
                      }

                      if (state.src.slice(pos, pos + endMarker.length) === endMarker) {
                        autoClosed = true;
                        break;
                      }

                      nextLine++;
                    }

                    if (!autoClosed) return false;
                    if (silent) return true;

                    let token = state.push("rtl_block_open", "div", 1);
                    token.markup = startMarker;
                    token.block = true;
                    token.map = [start, nextLine];

                    // Parse content between markers
                    let contentStart = start + 1;
                    if (firstLine) {
                      const lineStart = start;
                      const lineEnd = start + 1;

                      const contentOpen = state.push("paragraph_open", "p", 1);
                      contentOpen.map = [lineStart, lineEnd];

                      const inlineToken = state.push("inline", "", 0);
                      inlineToken.content = firstLine;
                      inlineToken.map = [lineStart, lineEnd];
                      inlineToken.children = [];

                      try {
                        state.md.inline.parse(firstLine, state.md, state.env, inlineToken.children);
                      } catch (e) {
                        inlineToken.children = inlineToken.children || [];
                      }

                      state.push("paragraph_close", "p", -1);
                    }

                    if (contentStart < nextLine) {
                      state.md.block.tokenize(state, contentStart, nextLine);
                    }

                    token = state.push("rtl_block_close", "div", -1);
                    token.markup = endMarker;
                    token.block = true;

                    state.line = nextLine + 1;
                    return true;
                  },
                );

                md.renderer.rules["rtl_block_open"] = () => {
                  return `<div dir="rtl" data-type="rtl-block">`;
                };
                md.renderer.rules["rtl_block_close"] = () => {
                  return `</div>`;
                };
              });
            },
          },
        },
      };
    },

    parseHTML() {
      return [
        { tag: 'div[dir="rtl"]' },
        { tag: 'div[data-type="rtl-block"]' },
      ];
    },

    renderHTML({ HTMLAttributes = {} }) {
      return [
        "div",
        { dir: "rtl", "data-type": "rtl-block", ...HTMLAttributes },
        0,
      ];
    },

    addCommands() {
      return {
        setRtlBlock:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
              content: [{ type: "paragraph" }],
            });
          },

        wrapInRtlBlock:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.wrapIn(this.name, attributes);
          },

        toggleRtlBlock:
          () =>
          ({ commands, editor }) => {
            const isActive = editor.isActive(this.name);
            if (isActive) {
              return commands.lift(this.name);
            }
            // Prevent nesting inside other rtl/lang blocks
            const insideRtl = editor.isActive("rtlBlock");
            if (insideRtl) return false;
            return commands.wrapIn(this.name);
          },

        unsetRtlBlock:
          () =>
          ({ commands }) => {
            return commands.lift(this.name);
          },
      };
    },
  });

export const RTLBlock = createRtlNode();
export default RTLBlock;
