import { Mark } from "@tiptap/core";

import { isInsideBlockConditional } from "./Conditional/Helpers";
import {
  createInputRules,
  createKeyboardShortcuts,
  createPasteRules,
  createPlugins,
} from "./Conditional/Input";

// An inline mark that conditionally renders text content.
// Example: Sign in to your ((isEN??cxpLabel)) account.

const ConditionalInlineMark = Mark.create({
  name: "conditionalInline",

  addOptions() {
    return {
      HTMLAttributes: {},
      prefix: "IF ((",
      suffix: ")) is YES",
    };
  },

  // Keep the mark inclusive so typing at the end stays within
  inclusive: true,

  exitable: true,

  // Group separately from other marks
  group: "conditionalInline",

  addAttributes() {
    return {
      condition: {
        default: "condition",
        parseHTML: (element) => element.getAttribute("data-condition"),
        renderHTML: (attributes) => {
          return {
            "data-condition": attributes.condition,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="conditional-inline"]',
        getAttrs: (element) => ({
          condition: element.getAttribute("data-condition"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const condition = HTMLAttributes.condition || "condition";
    // Store the condition value separately so it can be wrapped with localized text
    // The prefix and suffix come from the extension options (configured per language)
    return [
      "span",
      {
        "data-type": "conditional-inline",
        "data-condition": condition,
        "data-prefix": this.options.prefix,
        "data-suffix": this.options.suffix,
        class: "conditional-inline",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addInputRules() {
    return createInputRules(this, this.type);
  },

  addPasteRules() {
    return createPasteRules(this, this.type);
  },

  addCommands() {
    return {
      setConditionalInline:
        (condition = "condition") =>
        ({ commands, editor, state }) => {
          // Do not allow inline conditionals inside block conditionals
          if (isInsideBlockConditional(state)) {
            return false;
          }

          // If text is selected, apply the mark
          const { from, to } = editor.state.selection;
          if (from !== to) {
            return commands.setMark(this.name, { condition });
          }

          // No selection, insert a template conditional
          return commands.insertContent({
            type: "text",
            marks: [{ type: this.name, attrs: { condition } }],
            text: "conditional text",
          });
        },

      toggleConditionalInline:
        (condition = "condition") =>
        ({ commands, editor, state }) => {
          if (editor.isActive(this.name)) {
            return commands.unsetMark(this.name);
          }

          // Do not allow inline conditionals inside block conditionals
          if (isInsideBlockConditional(state)) {
            return false;
          }

          const { from, to } = editor.state.selection;
          if (from !== to) {
            return commands.setMark(this.name, { condition });
          }

          return commands.insertContent({
            type: "text",
            marks: [{ type: this.name, attrs: { condition } }],
            text: "conditional text",
          });
        },

      unsetConditionalInline:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return createKeyboardShortcuts(this, this.type);
  },

  addProseMirrorPlugins() {
    return createPlugins(this, this.type);
  },

  addStorage() {
    return {
      markdown: {
        serialize: {
          open: (state, mark) => {
            const condition = mark.attrs.condition || "condition";
            return `((${condition}??`;
          },
          close: () => "))",
          expelEnclosingWhitespace: true,
        },
        parse: {
          setup(markdownit) {
            markdownit.use((md) => {
              // Guard against duplicate registration
              if (md.__notifyConditionalInlineInstalled) return;
              md.__notifyConditionalInlineInstalled = true;

              // Add inline rule to parse ((condition??content)) patterns
              md.inline.ruler.before(
                "text",
                "conditional_inline",
                (state, silent) => {
                  const start = state.pos;
                  const max = state.posMax;

                  // Do not allow inline conditionals inside block conditionals
                  if (state.env?.__notifyDisableConditional === true) {
                    return false;
                  }

                  // Need at least ((c??x)) = 8 characters
                  if (start + 8 > max) return false;
                  if (state.src.slice(start, start + 2) !== "((") return false;

                  let pos = start + 2;

                  // Find the ?? separator
                  const condEnd = state.src.indexOf("??", pos);
                  if (condEnd === -1 || condEnd >= max) return false;

                  const condition = state.src.slice(pos, condEnd);

                  // Skip if condition contains newlines (that would be a block conditional)
                  if (condition.includes("\n")) return false;

                  pos = condEnd + 2;

                  // Find the closing ))
                  let closeIdx = -1;
                  let innerDepth = 0;

                  while (pos < max - 1) {
                    if (state.src.slice(pos, pos + 2) === "((") {
                      innerDepth += 1;
                      pos += 2;
                      continue;
                    }

                    if (state.src.slice(pos, pos + 2) === "))") {
                      if (innerDepth > 0) {
                        innerDepth -= 1;
                        pos += 2;
                        continue;
                      }

                      closeIdx = pos;
                      break;
                    }

                    pos++;
                  }

                  if (closeIdx === -1) return false;

                  const content = state.src.slice(condEnd + 2, closeIdx);

                  // Skip if content contains newlines (that would be a block conditional)
                  if (content.includes("\n")) return false;

                  if (silent) {
                    state.pos = closeIdx + 2;
                    return true;
                  }

                  // Create the opening tag token
                  const tokenOpen = state.push(
                    "conditional_inline_open",
                    "span",
                    1,
                  );
                  tokenOpen.attrs = [
                    ["data-type", "conditional-inline"],
                    ["data-condition", condition.trim()],
                  ];
                  tokenOpen.markup = `((${condition}??`;

                  // Create the text content token
                  const tokenText = state.push("text", "", 0);
                  tokenText.content = content;

                  // Create the closing tag token
                  const tokenClose = state.push(
                    "conditional_inline_close",
                    "span",
                    -1,
                  );
                  tokenClose.markup = "))";

                  state.pos = closeIdx + 2;
                  return true;
                },
              );

              // Add renderer rules
              md.renderer.rules.conditional_inline_open = (tokens, idx) => {
                const token = tokens[idx];
                const condition =
                  token.attrGet("data-condition") || "condition";
                return `<span data-type="conditional-inline" data-condition="${condition}" class="conditional-inline">`;
              };
              md.renderer.rules.conditional_inline_close = () => "</span>";
            });
          },
        },
      },
    };
  },
});

export default ConditionalInlineMark;
