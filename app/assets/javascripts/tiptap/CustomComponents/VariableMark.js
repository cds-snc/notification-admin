import { Mark, InputRule } from "@tiptap/core";

const VariableMark = Mark.create({
  name: "variable",

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  // Make the mark less sticky - don't extend when typing at edges
  inclusive: false,

  // Don't group with other marks
  group: "variable",

  parseHTML() {
    return [
      {
        tag: 'span[data-type="variable"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      {
        "data-type": "variable",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addInputRules() {
    const markType = this.type;

    return [
      new InputRule({
        find: /\(\(([A-Za-z0-9]+)\)\)$/,
        handler: ({ state, range, match }) => {
          // Try to read the matched text from the doc (may fail in some contexts)
          let matchedText = null;
          try {
            matchedText = state.doc.textBetween(range.from, range.to);
          } catch (e) {
            // ignore
          }

          console.log("[VariableMark] input-rule: match attempt", {
            match,
            range,
            matchedText,
          });

          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const varName = match && match[1] ? match[1] : null;

          if (varName) {
            // Replace typed ((name)) with the text node marked as variable
            console.log("[VariableMark] input-rule: applying variable mark", {
              varName,
              start,
              end,
            });
            tr.replaceWith(
              start,
              end,
              state.schema.text(varName, [markType.create()]),
            );
          } else {
            console.log(
              "[VariableMark] input-rule: no varName, skipping replacement",
              { match },
            );
          }
        },
      }),
    ];
  },

  // Add commands for variable mark
  addCommands() {
    return {
      setVariable:
        (attributes = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "text",
            marks: [{ type: this.name, attrs: attributes }],
            text: "variable",
          });
        },
      toggleVariable:
        (attributes = {}) =>
        ({ commands, editor }) => {
          if (editor.isActive(this.name)) {
            return commands.unsetMark(this.name);
          }

          // If text is selected, just apply the variable mark
          const { from, to } = editor.state.selection;
          if (from !== to) {
            return commands.setMark(this.name, attributes);
          }

          // No selection, insert a template variable
          return commands.insertContent({
            type: "text",
            marks: [{ type: this.name, attrs: attributes }],
            text: "variable",
          });
        },
    };
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: () => "((",
          close: () => "))",
          expelEnclosingWhitespace: true,
        },
        parse: {
          // Update how we set up the markdown parser to use the plugin pattern
          setup(markdownit) {
            // Use the plugin pattern to ensure proper initialization
            markdownit.use((md) => {
              // Add a simple inline rule to parse (( )) syntax
              // Use 'text' as the reference instead of 'emphasis' to ensure it runs early
              md.inline.ruler.before("text", "variable", (state, silent) => {
                const start = state.pos;
                const max = state.posMax;

                // Need at least (( + )) = 4 characters
                if (start + 4 > max) return false;
                if (state.src.slice(start, start + 2) !== "((") return false;

                let pos = start + 2;
                let found = false;

                // Search for the closing ))
                while (pos < max - 1) {
                  if (state.src.slice(pos, pos + 2) === "))") {
                    found = true;
                    break;
                  }
                  pos++;
                }

                if (!found) return false;

                // In silent mode, just advance the position
                if (silent) {
                  state.pos = pos + 2;
                  return true;
                }

                // Extract the variable name
                const content = state.src.slice(start + 2, pos);
                console.log(
                  "[VariableMark] inline parser found variable:",
                  content,
                );

                // Create the opening tag token
                const tokenOpen = state.push("variable_open", "span", 1);
                tokenOpen.attrs = [["data-type", "variable"]];
                tokenOpen.markup = "((";

                // Create the text content token
                const tokenText = state.push("text", "", 0);
                tokenText.content = content;

                // Create the closing tag token
                const tokenClose = state.push("variable_close", "span", -1);
                tokenClose.markup = "))";

                // Move past the closing ))
                state.pos = pos + 2;
                return true;
              });

              // Add renderer rules for the tokens
              // TODO: come up with markup that allows screen readers to identify these custom blocks
              md.renderer.rules.variable_open = () =>
                '<span data-type="variable">';
              md.renderer.rules.variable_close = () => "</span>";

              // Post-process inline text tokens so any remaining ((...)) sequences
              // are converted into variable tokens. This ensures variables are
              // recognized in contexts where inline rules may not run (lists,
              // blockquotes, language blocks, etc.).
              md.core.ruler.push("variable_inline_transform", (state) => {
                const Token = state.Token;

                for (let i = 0; i < state.tokens.length; i++) {
                  const blockToken = state.tokens[i];
                  if (blockToken.type !== "inline" || !blockToken.children)
                    continue;

                  const newChildren = [];

                  for (let j = 0; j < blockToken.children.length; j++) {
                    const child = blockToken.children[j];

                    if (
                      child.type === "text" &&
                      child.content &&
                      child.content.includes("((")
                    ) {
                      let remaining = child.content;
                      console.log(
                        "[VariableMark] core ruler scanning text:",
                        child.content,
                      );

                      while (remaining.length > 0) {
                        const openIdx = remaining.indexOf("((");
                        if (openIdx === -1) {
                          const t = new Token("text", "", 0);
                          t.content = remaining;
                          newChildren.push(t);
                          break;
                        }

                        if (openIdx > 0) {
                          const t = new Token("text", "", 0);
                          t.content = remaining.slice(0, openIdx);
                          newChildren.push(t);
                        }

                        const closeIdx = remaining.indexOf("))", openIdx + 2);
                        if (closeIdx === -1) {
                          // No closing - push the rest as text
                          const t = new Token("text", "", 0);
                          t.content = remaining.slice(openIdx);
                          newChildren.push(t);
                          break;
                        }

                        const varName = remaining.slice(openIdx + 2, closeIdx);
                        console.log(
                          "[VariableMark] core ruler extracted var:",
                          varName,
                        );

                        const tOpen = new Token("variable_open", "span", 1);
                        tOpen.attrs = [["data-type", "variable"]];
                        tOpen.markup = "((";
                        const tText = new Token("text", "", 0);
                        tText.content = varName;
                        const tClose = new Token("variable_close", "span", -1);
                        tClose.markup = "))";

                        newChildren.push(tOpen, tText, tClose);

                        remaining = remaining.slice(closeIdx + 2);
                      }
                    } else {
                      newChildren.push(child);
                    }
                  }

                  blockToken.children = newChildren;
                }
              });
            });
          },
        },
      },
    };
  },
});

export default VariableMark;
