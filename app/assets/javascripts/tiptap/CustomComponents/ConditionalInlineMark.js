import { Mark, markInputRule, markPasteRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

// An inline mark that conditionally renders text content.
// Example: Sign in to your ((isEN??cxpLabel)) account.

// Helper to check if the current position is inside a block conditional
const isInsideBlockConditional = (state, pos = null) => {
  const $pos = pos !== null ? state.doc.resolve(pos) : state.selection.$from;
  for (let depth = $pos.depth; depth > 0; depth--) {
    if ($pos.node(depth).type.name === "conditional") {
      return true;
    }
  }
  return false;
};

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
    return [
      markInputRule({
        // Match ((condition??content)) pattern when typed inline
        // This will only trigger for single-line content
        find: /\(\(([^?)]+)\?\?([^)]*)\)\)$/,
        type: this.type,
        getAttributes: (match) => {
          return {
            condition: (match[1] || "condition").trim() || "condition",
          };
        },
      }),
    ].map((rule) => {
      // Wrap the original handler to check for block conditionals
      const originalHandler = rule.handler;
      rule.handler = (props) => {
        // Prevent inline conditionals inside block conditionals
        if (isInsideBlockConditional(props.state, props.range.from)) {
          return null;
        }
        return originalHandler(props);
      };
      return rule;
    });
  },

  addPasteRules() {
    return [
      markPasteRule({
        // Match single-line ((condition??content)) patterns during paste
        find: /\(\(([^?\n)]+)\?\?([^\n)]*)\)\)/g,
        type: this.type,
        getAttributes: (match) => {
          return {
            condition: (match[1] || "condition").trim() || "condition",
          };
        },
      }),
    ].map((rule) => {
      // Wrap the original handler to check for block conditionals
      const originalHandler = rule.handler;
      if (originalHandler) {
        rule.handler = (props) => {
          // Prevent inline conditionals inside block conditionals
          if (isInsideBlockConditional(props.state, props.range.from)) {
            return null;
          }
          return originalHandler(props);
        };
      }
      return rule;
    });
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
    // Helper function to convert inline conditional to block conditional
    const convertToBlockConditional = (editor, mark, splitAtCursor = true) => {
      const { state } = editor;
      const { $from } = state.selection;
      const condition = mark.attrs.condition || "condition";

      // Find the range of the inline conditional mark at the cursor
      let markFrom = $from.pos;
      let markTo = $from.pos;

      // Search backward to find the start of the mark
      state.doc.nodesBetween(
        Math.max(0, $from.pos - 200),
        $from.pos,
        (node, pos) => {
          if (
            node.isText &&
            node.marks.some(
              (m) =>
                m.type.name === this.name && m.attrs.condition === condition,
            )
          ) {
            markFrom = Math.min(markFrom, pos);
          }
        },
      );

      // Search forward to find the end of the mark
      state.doc.nodesBetween(
        $from.pos,
        Math.min(state.doc.content.size, $from.pos + 200),
        (node, pos) => {
          if (
            node.isText &&
            node.marks.some(
              (m) =>
                m.type.name === this.name && m.attrs.condition === condition,
            )
          ) {
            markTo = Math.max(markTo, pos + node.nodeSize);
          }
        },
      );

      // Get text before and after cursor within the mark
      const textBeforeCursor = state.doc.textBetween(markFrom, $from.pos, "\n");
      const textAfterCursor = state.doc.textBetween($from.pos, markTo, "\n");

      // Create a transaction to replace the inline mark with a block conditional
      const { tr } = state;

      // Delete the inline conditional mark
      tr.delete(markFrom, markTo);

      // Create the block conditional node
      const schema = state.schema;
      const paragraphs = [];

      if (splitAtCursor) {
        // Split content at cursor into two paragraphs
        const paragraph1 = schema.nodes.paragraph.create(
          null,
          textBeforeCursor ? schema.text(textBeforeCursor) : undefined,
        );
        const paragraph2 = schema.nodes.paragraph.create(
          null,
          textAfterCursor ? schema.text(textAfterCursor) : undefined,
        );
        paragraphs.push(paragraph1, paragraph2);
      } else {
        // Keep all content in one paragraph
        const text = textBeforeCursor + textAfterCursor;
        const paragraph = schema.nodes.paragraph.create(
          null,
          text ? schema.text(text) : undefined,
        );
        paragraphs.push(paragraph);
      }

      const conditionalNode = schema.nodes.conditional.create(
        { condition },
        paragraphs,
      );

      // Insert the block conditional
      tr.insert(markFrom, conditionalNode);

      // Position cursor appropriately
      let cursorPos;
      if (splitAtCursor) {
        // Position at start of second paragraph
        cursorPos = markFrom + paragraphs[0].nodeSize + 1;
      } else {
        // Position at end of content
        cursorPos = markFrom + conditionalNode.nodeSize - 2;
      }
      tr.setSelection(
        state.selection.constructor.near(tr.doc.resolve(cursorPos)),
      );

      editor.view.dispatch(tr);
      return true;
    };

    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Check if cursor is inside an inline conditional mark
        const mark = $from.marks().find((m) => m.type.name === this.name);
        if (!mark) return false;

        return convertToBlockConditional.call(this, editor, mark, true);
      },

      Space: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Check if cursor is inside an inline conditional mark
        const mark = $from.marks().find((m) => m.type.name === this.name);
        if (!mark) return false;

        // Get the text before cursor in the current node
        const textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - 10),
          $from.parentOffset,
          null,
          "\ufffc",
        );

        // Check for heading patterns: # or ##
        if (/^#{1,6}$/.test(textBefore.trim())) {
          return convertToBlockConditional.call(this, editor, mark, false);
        }

        // Check for list patterns: -, *, +, 1.
        if (
          /^[-*+]$/.test(textBefore.trim()) ||
          /^\d+\.$/.test(textBefore.trim())
        ) {
          return convertToBlockConditional.call(this, editor, mark, false);
        }

        return false;
      },

      "-": ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;

        // Check if cursor is inside an inline conditional mark
        const mark = $from.marks().find((m) => m.type.name === this.name);
        if (!mark) return false;

        // Get the text before cursor
        const textBefore = $from.parent.textBetween(
          Math.max(0, $from.parentOffset - 2),
          $from.parentOffset,
          null,
          "\ufffc",
        );

        // Check for horizontal rule pattern: -- (will become --- after this dash)
        if (textBefore === "--") {
          return convertToBlockConditional.call(this, editor, mark, false);
        }

        return false;
      },
    };
  },

  addProseMirrorPlugins() {
    const markType = this.type;

    const interactionKey = new PluginKey("conditionalInlineInteraction");

    const getMarkAtPos = (doc, pos) => {
      try {
        if (pos < 0 || pos > doc.content.size) return null;
        const $pos = doc.resolve(pos);
        return $pos.marks().find((m) => m.type === markType) || null;
      } catch (e) {
        return null;
      }
    };

    const findRangeInTextblock = (state, condition, aroundPos) => {
      const $around = state.doc.resolve(aroundPos);
      const parentStart = $around.start();
      const parentEnd = $around.end();
      let from = null;
      let to = null;

      state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
        if (!node.isText) return;
        const has = node.marks.some(
          (m) => m.type === markType && m.attrs?.condition === condition,
        );
        if (!has) return;
        if (from === null || pos < from) from = pos;
        const end = pos + node.nodeSize;
        if (to === null || end > to) to = end;
      });

      if (from === null || to === null) return null;

      const before = state.doc
        .textBetween(parentStart, from, "\n", "\ufffc")
        .trim();
      const after = state.doc.textBetween(to, parentEnd, "\n", "\ufffc").trim();

      return {
        from,
        to,
        parentStart,
        parentEnd,
        onlyThingOnLine: before.length === 0 && after.length === 0,
      };
    };

    const focusEditButton = (editorDom, { condition, from }) => {
      const button = editorDom.querySelector(
        `.conditional-inline-edit-btn[data-pos="${from}"][data-condition="${condition}"]`,
      );
      if (button && typeof button.focus === "function") {
        button.focus();
        return true;
      }
      return false;
    };

    const hasSpaceAt = (doc, pos) => {
      try {
        if (pos < 0 || pos >= doc.content.size) return false;
        const text = doc.textBetween(pos, pos + 1, "\n", "\ufffc");
        return text === " ";
      } catch (e) {
        return false;
      }
    };

    const getInteractionMeta = (tr) => {
      const existing = tr.getMeta(interactionKey);
      if (existing && typeof existing === "object") return existing;
      return { addedSpacePositions: [] };
    };

    const trackInsertedSpace = (tr, pos) => {
      const meta = getInteractionMeta(tr);
      meta.addedSpacePositions = [...(meta.addedSpacePositions || []), pos];
      tr.setMeta(interactionKey, meta);
    };

    return [
      new Plugin({
        key: new PluginKey("conditionalInlineDecorations"),
        state: {
          init(_, { doc }) {
            return findConditionalMarks(doc, markType);
          },
          apply(tr, oldState) {
            return tr.docChanged
              ? findConditionalMarks(tr.doc, markType)
              : oldState;
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),

      // Single plugin for conditional inline navigation rules.
      new Plugin({
        key: interactionKey,
        state: {
          init() {
            return {
              insertedSpaces: [],
            };
          },
          apply(tr, prev) {
            const next = { insertedSpaces: [] };

            // Map existing tracked positions through the transaction.
            for (const pos of prev.insertedSpaces || []) {
              const mapped = tr.mapping.mapResult(pos, -1);
              if (!mapped.deleted) next.insertedSpaces.push(mapped.pos);
            }

            // Add newly inserted spaces from transaction meta.
            const meta = tr.getMeta(interactionKey);
            const added = meta?.addedSpacePositions;
            if (Array.isArray(added)) {
              for (const pos of added) {
                // The inserted content starts at `pos` in the new document.
                const mapped = tr.mapping.mapResult(pos, -1);
                if (!mapped.deleted) next.insertedSpaces.push(mapped.pos);
              }
            }

            next.insertedSpaces = Array.from(new Set(next.insertedSpaces)).sort(
              (a, b) => a - b,
            );
            return next;
          },
        },
        props: {
          handleKeyDown(view, event) {
            if (event.defaultPrevented) return false;
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
              return false;

            const { state } = view;
            if (!state.selection.empty) return false;

            const cursorPos = state.selection.from;
            const storedMark =
              state.storedMarks?.find?.((m) => m.type === markType) || null;
            const markAtCursor =
              state.selection.$from.marks().find((m) => m.type === markType) ||
              null;
            const markAhead = getMarkAtPos(state.doc, cursorPos + 1);
            const markBehind =
              getMarkAtPos(state.doc, cursorPos - 1) ||
              getMarkAtPos(state.doc, cursorPos - 2);

            const interactionState = interactionKey.getState(state);
            const trackedSpaces = interactionState?.insertedSpaces || [];
            const isTrackedSpaceAt = (pos) =>
              trackedSpaces.includes(pos) && hasSpaceAt(state.doc, pos);

            // Resolve the condition to use for range detection.
            const activeMark =
              markAtCursor || storedMark || markAhead || markBehind;
            if (!activeMark) return false;
            const condition = activeMark.attrs?.condition;
            if (!condition) return false;

            const range = findRangeInTextblock(state, condition, cursorPos);
            if (!range) return false;

            // Rule 1: at the mark start boundary (of the content), ArrowLeft selects the edit button.
            if (event.key === "ArrowLeft") {
              // If we're currently just to the right of a tracked helper space that was
              // inserted when exiting to the right, remove it before moving back into the mark.
              if (isTrackedSpaceAt(cursorPos - 1) && markBehind) {
                const tr = state.tr;
                tr.delete(cursorPos - 1, cursorPos);
                tr.setSelection(TextSelection.create(tr.doc, cursorPos - 1));
                tr.setStoredMarks([markBehind]);
                view.dispatch(tr);
                event.preventDefault();
                return true;
              }

              // If we're one character into the mark, prevent the browser/PM from
              // skipping the boundary (it can jump outside due to the non-editable widget).
              // Instead, land explicitly on the mark start boundary first.
              if (markAtCursor && cursorPos === range.from + 1) {
                const tr = state.tr;
                tr.setSelection(TextSelection.create(tr.doc, range.from));
                tr.setStoredMarks([markAtCursor]);
                view.dispatch(tr);
                event.preventDefault();
                return true;
              }

              // Important: only do this when the selection is actually *in* the mark context.
              // If we're outside-left of the mark at the same boundary position, ArrowLeft
              // should continue moving left rather than snapping back to the edit button.
              if (cursorPos === range.from && (markAtCursor || storedMark)) {
                const focused = focusEditButton(view.dom, {
                  condition,
                  from: range.from,
                });
                if (focused) {
                  event.preventDefault();
                  return true;
                }
              }
              return false;
            }

            // ArrowRight rules
            // Rule 2: from outside-left of a mark, ArrowRight enters mark at boundary without selecting button.
            if (
              !markAtCursor &&
              !storedMark &&
              cursorPos === range.from &&
              markAhead
            ) {
              const tr = state.tr;

              // If we inserted a helper space to the left of this mark earlier,
              // remove it now that the user is re-entering from the left.
              if (isTrackedSpaceAt(range.from - 1)) {
                tr.delete(range.from - 1, range.from);
                tr.setSelection(TextSelection.create(tr.doc, range.from - 1));
              } else {
                tr.setSelection(TextSelection.create(tr.doc, range.from));
              }

              tr.setStoredMarks([markAhead]);
              view.dispatch(tr);
              event.preventDefault();
              return true;
            }

            // Rule 4/6: exiting to the right when mark is the only thing on the line inserts a space and allowing content to be added to the line.
            if (
              markAtCursor &&
              cursorPos === range.to &&
              range.onlyThingOnLine
            ) {
              const tr = state.tr;

              // Avoid repeatedly inserting spaces if one already exists.
              if (hasSpaceAt(state.doc, range.to)) {
                tr.setSelection(TextSelection.create(tr.doc, range.to + 1));
                tr.setStoredMarks([]);
              } else {
                tr.insertText(" ", range.to, range.to);
                tr.removeMark(range.to, range.to + 1, markType);
                tr.setSelection(TextSelection.create(tr.doc, range.to + 1));
                tr.setStoredMarks([]);
                trackInsertedSpace(tr, range.to);
              }

              view.dispatch(tr);
              event.preventDefault();
              return true;
            }

            return false;
          },
        },
        view(editorView) {
          const handleNavigate = (event) => {
            const { action, pos } = event.detail || {};
            if (!action || typeof pos !== "number") return;

            const { state } = editorView;
            const markAtPos =
              getMarkAtPos(state.doc, pos + 1) || getMarkAtPos(state.doc, pos);
            if (!markAtPos) return;

            const condition = markAtPos.attrs?.condition;
            if (!condition) return;

            const range = findRangeInTextblock(state, condition, pos);
            if (!range) return;

            if (action === "enterFromButton") {
              editorView.focus();
              const tr = state.tr;
              tr.setSelection(TextSelection.create(tr.doc, range.from));
              tr.setStoredMarks([markAtPos]);
              editorView.dispatch(tr);
              return;
            }

            if (action === "exitLeftFromButton") {
              editorView.focus();
              const tr = state.tr;

              // Rule 5: if mark is the only thing on the line, exiting left inserts a space.
              if (range.onlyThingOnLine) {
                // Avoid repeatedly inserting spaces if one already exists.
                // When we insert, the space ends up immediately before the mark start.
                // After the first insertion, the mark start shifts right by 1, so we must
                // check `range.from - 1`, not `range.from`.
                if (!hasSpaceAt(state.doc, range.from - 1)) {
                  tr.insertText(" ", range.from, range.from);
                  tr.removeMark(range.from, range.from + 1, markType);
                  trackInsertedSpace(tr, range.from);
                }
                tr.setSelection(TextSelection.create(tr.doc, range.from));
                tr.setStoredMarks([]);
                editorView.dispatch(tr);
                return;
              }

              // Otherwise, let the caret flow left naturally by selecting near the left.
              const selection = TextSelection.near(
                tr.doc.resolve(Math.max(range.from - 1, range.parentStart)),
                -1,
              );
              tr.setSelection(selection);
              tr.setStoredMarks([]);
              editorView.dispatch(tr);
              return;
            }
          };

          const editorDom = editorView.dom;
          editorDom.addEventListener(
            "conditionalInlineNavigate",
            handleNavigate,
          );
          return {
            destroy() {
              editorDom.removeEventListener(
                "conditionalInlineNavigate",
                handleNavigate,
              );
            },
          };
        },
      }),
    ];
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

// Helper function to find all conditional inline marks and create widget decorations
function findConditionalMarks(doc, markType) {
  const decorations = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const marks = node.marks.filter((m) => m.type === markType);
    if (marks.length === 0) return;

    // For each conditional mark, add a widget at the beginning
    marks.forEach((mark) => {
      // Check if this is the start of the mark range
      const $pos = doc.resolve(pos);
      const prevNode = $pos.nodeBefore;

      // Only add widget if this is the first node with this mark
      if (!prevNode || !prevNode.marks.some((m) => m === mark)) {
        // This is the start of the mark, create a simple button
        const widget = document.createElement("button");
        widget.type = "button";
        widget.className = "conditional-inline-edit-btn";
        widget.setAttribute("contenteditable", "false");
        widget.setAttribute("data-condition", mark.attrs.condition);
        widget.setAttribute("data-pos", pos);
        widget.setAttribute("aria-label", "Edit conditional");
        widget.setAttribute("tabindex", "-1");
        widget.innerHTML =
          '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';

        // Add keyboard handler for navigation
        widget.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();

            // Move cursor to the start of the conditional content
            // Use a custom event to communicate with the editor
            const customEvent = new CustomEvent("conditionalInlineNavigate", {
              bubbles: true,
              detail: { action: "enterFromButton", pos: pos },
            });
            widget.dispatchEvent(customEvent);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            event.stopPropagation();

            // Move focus out of the mark (to before it)
            const customEvent = new CustomEvent("conditionalInlineNavigate", {
              bubbles: true,
              detail: { action: "exitLeftFromButton", pos: pos },
            });
            widget.dispatchEvent(customEvent);
          }
        });

        decorations.push(
          Decoration.widget(pos, widget, {
            // Keep the edit button visually inside the mark.
            // Also don't let selection/caret rendering treat the widget as a selection target.
            side: 1,
            ignoreSelection: true,
          }),
        );
      }
    });
  });

  return DecorationSet.create(doc, decorations);
}

export default ConditionalInlineMark;
