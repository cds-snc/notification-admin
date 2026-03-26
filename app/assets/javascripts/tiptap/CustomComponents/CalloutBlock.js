import { Node, wrappingInputRule } from "@tiptap/core";
import { Plugin } from "prosemirror-state";

export const CalloutBlock = Node.create({
  name: "calloutBlock",
  content: "block*",
  group: "block",
  selectable: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addInputRules() {
    return [
      wrappingInputRule({
        find: /^\[\[callout\]\]$/,
        type: this.type,
      }),
    ];
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="callout-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-type": "callout-block",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addStorage() {
    return {
      markdown: {
        serialize(state, node) {
          state.write("[[callout]]\n");
          state.renderContent(node);
          state.flushClose(1);
          state.write("[[/callout]]");
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            markdownit.use((md) => {
              md.block.ruler.before(
                "paragraph",
                "callout_block",
                (state, start, end, silent) => {
                  const startMarker = "[[callout]]";
                  const endMarker = "[[/callout]]";

                  let pos = state.bMarks[start] + state.tShift[start];
                  let max = state.eMarks[start];

                  if (pos + startMarker.length > max) return false;
                  if (
                    state.src.slice(pos, pos + startMarker.length) !== startMarker
                  ) {
                    return false;
                  }

                  pos += startMarker.length;
                  const firstLine = state.src.slice(pos, max).trim();

                  let nextLine = start + 1;
                  let autoClosed = false;

                  while (nextLine < end) {
                    pos = state.bMarks[nextLine] + state.tShift[nextLine];
                    max = state.eMarks[nextLine];

                    if (pos < max && state.sCount[nextLine] < state.blkIndent) {
                      break;
                    }

                    if (
                      state.src.slice(pos, pos + endMarker.length) === endMarker
                    ) {
                      autoClosed = true;
                      break;
                    }

                    nextLine++;
                  }

                  if (!autoClosed) return false;
                  if (silent) return true;

                  let token = state.push("callout_block_open", "div", 1);
                  token.markup = startMarker;
                  token.block = true;
                  token.info = "";
                  token.map = [start, nextLine];

                  const contentStart = start + 1;
                  if (firstLine) {
                    const lineStart = start;
                    const lineEnd = start + 1;

                    const contentOpen = state.push("paragraph_open", "p", 1);
                    contentOpen.map = [lineStart, lineEnd];

                    const inlineToken = state.push("inline", "", 0);
                    inlineToken.content = firstLine;
                    inlineToken.map = [lineStart, lineEnd];
                    inlineToken.children = [];
                    state.md.inline.parse(
                      firstLine,
                      state.md,
                      state.env,
                      inlineToken.children,
                    );

                    state.push("paragraph_close", "p", -1);
                  }

                  if (contentStart < nextLine) {
                    state.md.block.tokenize(state, contentStart, nextLine);
                  } else {
                    const emptyPara = state.push("paragraph_open", "p", 1);
                    emptyPara.map = [start, nextLine];

                    const emptyInline = state.push("inline", "", 0);
                    emptyInline.content = "";
                    emptyInline.map = [start, nextLine];
                    emptyInline.children = [];

                    state.push("paragraph_close", "p", -1);
                  }

                  token = state.push("callout_block_close", "div", -1);
                  token.markup = endMarker;
                  token.block = true;

                  state.line = nextLine + 1;
                  return true;
                },
              );

              md.renderer.rules.callout_block_open = () => {
                return '<div data-type="callout-block">';
              };
              md.renderer.rules.callout_block_close = () => {
                return "</div>";
              };
            });
          },
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          let tr = null;

          newState.doc.descendants((node, pos) => {
            if (node.type.name !== this.name) return true;

            const $pos = newState.doc.resolve(pos);
            const parent = $pos.node($pos.depth - 1);

            if (parent && parent.type && parent.type.name === this.name) {
              if (!tr) tr = newState.tr;
              tr.replaceWith(pos, pos + node.nodeSize, node.content);
            }

            node.descendants((childNode, childPos) => {
              const isLanguageBlock =
                childNode.type.name === "englishBlock" ||
                childNode.type.name === "frenchBlock";

              if (!isLanguageBlock) return true;

              if (!tr) tr = newState.tr;
              const from = pos + childPos + 1;
              const to = from + childNode.nodeSize;
              tr.replaceWith(from, to, childNode.content);
              return true;
            });

            return true;
          });

          return tr || undefined;
        },
      }),
    ];
  },

  addCommands() {
    return {
      setCalloutBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes,
            content: [{ type: "paragraph" }],
          });
        },

      wrapInCalloutBlock:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attributes);
        },

      toggleCalloutBlock:
        (attributes = {}) =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.lift(this.name);
          }

          return commands.wrapIn(this.name, attributes);
        },

      unsetCalloutBlock:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
});
