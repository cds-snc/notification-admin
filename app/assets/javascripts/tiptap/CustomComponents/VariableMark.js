import { Mark, markInputRule } from "@tiptap/core";

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
    return [
      markInputRule({
        find: /\(\(([^)]+)\)\)$/,
        type: this.type,
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
              md.inline.ruler.before(
                "text",
                "variable",
                (state, silent) => {
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
                },
              );

              // Add renderer rules for the tokens
              // TODO: come up with markup that allows screen readers to identify these custom blocks
              md.renderer.rules.variable_open = () =>
                '<span data-type="variable">';
              md.renderer.rules.variable_close = () => "</span>";
            });
          },
        },
      },
    };
  },
});

export default VariableMark;
