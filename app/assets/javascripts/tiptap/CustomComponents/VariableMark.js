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
        find: /\(\(([^()]+)\)\)$/,
        handler: ({ state, range, match }) => {
          const { tr } = state;
          const start = range.from;
          const end = range.to;
          const varName = match && match[1] ? match[1] : null;

          if (varName) {
            // Check if there's a variable-marked node immediately before this position
            let hasVariableBefore = false;
            let nodeBefore = null;

            try {
              if (start > 1) {
                const $start = tr.doc.resolve(start);
                nodeBefore = $start.nodeBefore;

                if (nodeBefore) {
                  const marks = nodeBefore.marks || [];
                  hasVariableBefore = marks.some(
                    (m) => m.type.name === "variable",
                  );
                }
              }
            } catch (e) {
              // Ignore resolution errors
            }

            // Replace the ((name)) pattern with variable-marked text
            const nodes = [];

            // If there's a variable immediately before, insert a zero-width space separator
            if (hasVariableBefore) {
              nodes.push(state.schema.text("\u200B")); // Zero-width space
            }

            // Add the variable-marked text
            nodes.push(state.schema.text(varName, [markType.create()]));

            tr.replaceWith(start, end, nodes);
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

                // Extract the variable name
                const content = state.src.slice(start + 2, pos);

                // Skip if this looks like a conditional block (contains ??)
                if (content.includes("??")) {
                  return false;
                }

                // In silent mode, just advance the position
                if (silent) {
                  state.pos = pos + 2;
                  return true;
                }

                // Check if content contains parentheses and reject if so
                if (content.includes("(") || content.includes(")"))
                  return false;

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
                        if (varName.includes("(") || varName.includes(")")) {
                          // Treat this as plain text if it contains parentheses
                          const t = new Token("text", "", 0);
                          t.content = remaining.slice(0, closeIdx + 2);
                          newChildren.push(t);
                          remaining = remaining.slice(closeIdx + 2);
                          continue;
                        }

                        // Skip if this looks like a conditional block (contains ??)
                        if (varName.includes("??")) {
                          // Push the whole pattern as text - let ConditionalNode handle it
                          const t = new Token("text", "", 0);
                          t.content = remaining.slice(openIdx, closeIdx + 2);
                          newChildren.push(t);
                          remaining = remaining.slice(closeIdx + 2);
                          continue;
                        }

                        // Check if the previous token was a variable_close - if so, insert separator
                        const lastToken = newChildren[newChildren.length - 1];
                        if (lastToken && lastToken.type === "variable_close") {
                          // Insert a zero-width space to prevent adjacent variables from merging
                          const tSeparator = new Token("text", "", 0);
                          tSeparator.content = "\u200B"; // Zero-width space
                          newChildren.push(tSeparator);
                        }

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

              // Post-process to insert separators between adjacent variables
              // This handles cases where variables are created by the inline rule
              md.core.ruler.after(
                "variable_inline_transform",
                "variable_separator",
                (state) => {
                  const Token = state.Token;

                  for (let i = 0; i < state.tokens.length; i++) {
                    const blockToken = state.tokens[i];
                    if (blockToken.type !== "inline" || !blockToken.children)
                      continue;

                    const newChildren = [];
                    let prevWasVariableClose = false;

                    for (let j = 0; j < blockToken.children.length; j++) {
                      const child = blockToken.children[j];

                      // If this is a variable_open and previous was variable_close, insert separator
                      if (
                        child.type === "variable_open" &&
                        prevWasVariableClose
                      ) {
                        const tSeparator = new Token("text", "", 0);
                        tSeparator.content = "\u200B"; // Zero-width space
                        newChildren.push(tSeparator);
                      }

                      newChildren.push(child);
                      prevWasVariableClose = child.type === "variable_close";
                    }

                    blockToken.children = newChildren;
                  }
                },
              );
            });
          },
        },
      },
    };
  },
});

export default VariableMark;
