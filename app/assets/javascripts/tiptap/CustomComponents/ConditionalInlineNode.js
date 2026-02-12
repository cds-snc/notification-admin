import { Node, mergeAttributes, InputRule, PasteRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

import {
  isInsideBlockConditional,
  forceDomSelectionToPos,
  setCaretToPos,
  selectAllContents,
  isSelectionAtEnd,
  isSelectionAtStart,
} from "./Conditional/Helpers";
import { convertToBlockConditional } from "./Conditional/Conversion";
import { installConditionalInlineMarkdownIt } from "./Conditional/MarkdownIt";

const RETURN_FOCUS_INPUT_META = "__notifyConditionalReturnFocusInput";

// Inline conditional as an inline node so the cursor has real
// before/inside/after positions.

const ConditionalInlineNode = Node.create({
  name: "conditionalInline",

  priority: 1000,

  inline: true,
  group: "inline",
  content: "inline+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      prefix: "IF ",
      suffix: " is YES",
      defaultCondition: "variable",
      conditionAriaLabel: "Condition",
    };
  },

  addAttributes() {
    return {
      condition: {
        default: this.options.defaultCondition,
        parseHTML: (element) => element.getAttribute("data-condition"),
        renderHTML: (attributes) => ({
          "data-condition": attributes.condition,
        }),
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
    // Preserve an intentionally empty condition. Only fall back for null/undefined.
    const condition = HTMLAttributes.condition ?? this.options.defaultCondition;
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "conditional-inline",
        "data-condition": condition,
        "data-prefix": this.options.prefix,
        "data-suffix": this.options.suffix,
        class: "conditional-inline",
      }),
      0,
    ];
  },

  addInputRules() {
    const nodeType = this.type;

    // Match ((condition??content)) when typed inline.
    // Single-line only (no newlines).
    return [
      new InputRule({
        // Match closing '))' that is not followed by another ')' so runs like
        // ')))' match the final pair, avoiding premature termination.
        find: /\(\(([^?)\n]+)\?\?([^\n]*?)\)\)(?!\))$/,
        handler: ({ state, range, match }) => {
          if (isInsideBlockConditional(state, range.from)) {
            return null;
          }

          const condition = (match[1] || "").trim();
          const text = match[2] || "";

          // Both sides must be present to create a conditional.
          if (!condition) return null;
          if (!text.trim()) return null;

          const content = state.schema.text(text);
          const wrapped = nodeType.create({ condition }, content);

          const tr = state.tr.replaceWith(range.from, range.to, wrapped);
          // Typed conversion: keep caret in content at the end of the existing text.
          try {
            const endOfContentPos = range.from + wrapped.nodeSize - 1;
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(endOfContentPos), -1),
            );
          } catch {
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(range.from + 1), 1),
            );
          }
          return tr;
        },
      }),
    ];
  },

  addPasteRules() {
    const nodeType = this.type;

    return [
      new PasteRule({
        // Prefer a closing '))' that is not followed by another ')' so
        // sequences like ')))' are treated correctly (use the last pair).
        find: /\(\(([^?\n)]+)\?\?([^\n]*?)\)\)(?!\))/g,
        handler: ({ state, range, match }) => {
          if (isInsideBlockConditional(state, range.from)) {
            return null;
          }

          const condition = (match[1] || "").trim();
          const text = match[2] || "";

          // Both sides must be present to create a conditional.
          if (!condition) return null;
          if (!text.trim()) return null;

          const content = state.schema.text(text);
          const wrapped = nodeType.create({ condition }, content);

          const tr = state.tr;
          tr.delete(range.from, range.to);
          tr.insert(range.from, wrapped);
          // After paste conversion, keep the caret in the conditional content at the end.
          try {
            const endOfContentPos = range.from + wrapped.nodeSize - 1;
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(endOfContentPos), -1),
            );
          } catch {
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(range.from + 1), 1),
            );
          }
          tr.scrollIntoView();
          return tr;
        },
      }),
    ];
  },

  addNodeView() {
    const normalizeCondition = (value) => (value || "").trim();

    const requestToolbarFocus = (view) => {
      try {
        const doc = view.dom?.ownerDocument || document;
        const toolbar = doc.querySelector('[data-testid="rte-toolbar"]');
        if (!toolbar) return;
        toolbar.dispatchEvent(
          new CustomEvent("rte-request-focus", { bubbles: true }),
        );
      } catch {
        // ignore
      }
    };

    return ({ node, view, getPos }) => {
      const dom = document.createElement("span");
      dom.className = "conditional-inline";
      dom.setAttribute("data-type", "conditional-inline");
      dom.setAttribute(
        "data-condition",
        node.attrs?.condition ?? this.options.defaultCondition,
      );
      dom.setAttribute("data-prefix", this.options.prefix);
      dom.setAttribute("data-suffix", this.options.suffix);

      const widget = document.createElement("span");
      widget.className = "conditional-inline-edit-widget";
      widget.setAttribute("contenteditable", "false");

      const prefixText = document.createElement("span");
      prefixText.className = "conditional-inline-edit-prefix";

      prefixText.append(document.createTextNode(this.options.prefix));

      const input = document.createElement("span");
      input.className = "conditional-inline-condition-input";
      input.contentEditable = "true";
      // Preserve empty string; only use default for missing attr.
      input.textContent =
        node.attrs?.condition ?? this.options.defaultCondition;
      input.setAttribute("data-editor-focusable", "true");
      input.setAttribute("aria-label", this.options.conditionAriaLabel);
      input.setAttribute("spellcheck", "false");
      input.setAttribute("role", "textbox");
      input.setAttribute("tabindex", "0");
      input.setAttribute("aria-multiline", "false");

      const suffixText = document.createElement("span");
      suffixText.className = "conditional-inline-edit-suffix";
      suffixText.textContent = this.options.suffix;

      const contentDOM = document.createElement("span");
      contentDOM.className = "conditional-inline-content";

      const commit = () => {
        try {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const nextCondition = normalizeCondition(input.textContent);
          const tr = view.state.tr;
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            condition: nextCondition,
          });
          view.dispatch(tr);
        } catch {
          // ignore
        }
      };

      const moveCursorToContentStart = () => {
        try {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const start = pos + 1;
          const tr = view.state.tr;
          tr.setSelection(TextSelection.near(tr.doc.resolve(start), 1));
          view.dispatch(tr);
          setTimeout(() => view.focus(), 0);
        } catch {
          // ignore
        }
      };

      const moveCursorToContentEnd = () => {
        try {
          const pos = typeof getPos === "function" ? getPos() : null;
          if (typeof pos !== "number") return;
          const inserted = view.state.doc.nodeAt(pos);
          if (!inserted) {
            moveCursorToContentStart();
            return;
          }

          const endOfContentPos = pos + inserted.nodeSize - 1;
          const tr = view.state.tr;
          tr.setSelection(
            TextSelection.near(tr.doc.resolve(endOfContentPos), -1),
          );
          view.dispatch(tr);
          setTimeout(() => view.focus(), 0);
        } catch {
          // ignore
        }
      };

      input.addEventListener(
        "keydown",
        (event) => {
          event.stopPropagation();
          event.stopImmediatePropagation?.();

          if (event.key === "Tab" && event.shiftKey) {
            event.preventDefault();
            try {
              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos === "number") {
                const tr = view.state.tr.setMeta(RETURN_FOCUS_INPUT_META, {
                  kind: "inline",
                  pos,
                });
                view.dispatch(tr);
              }
            } catch {
              // ignore
            }
            requestToolbarFocus(view);
            setTimeout(() => requestToolbarFocus(view), 0);
            return;
          }

          if (event.key === "Tab" && !event.shiftKey) {
            event.preventDefault();
            commit();
            moveCursorToContentEnd();
            return;
          }

          if (event.key === "Enter") {
            event.preventDefault();
            commit();
            moveCursorToContentStart();
            return;
          }

          if (event.key === "ArrowRight") {
            if (isSelectionAtEnd(input)) {
              event.preventDefault();
              commit();
              moveCursorToContentStart();
            }
            return;
          }

          if (event.key === "ArrowLeft") {
            if (!isSelectionAtStart(input)) return;

            event.preventDefault();
            commit();

            try {
              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos !== "number") return;

              const $nodePos = view.state.doc.resolve(pos);
              const atStartOfTextblock = $nodePos.parentOffset === 0;

              const tr = view.state.tr;
              tr.setStoredMarks([]);

              // If the conditional is the very first thing in this textblock,
              // ArrowLeft should behave like normal editing and jump to the end
              // of the previous block (the previous line), not "stick" before
              // the inline node.
              if (atStartOfTextblock && pos > 0) {
                tr.setSelection(
                  TextSelection.near(tr.doc.resolve(pos - 1), -1),
                );
              } else {
                tr.setSelection(TextSelection.create(tr.doc, pos));
              }
              view.dispatch(tr);

              requestAnimationFrame(() => {
                forceDomSelectionToPos(view, view.state.selection.from);
                view.focus();
              });
            } catch {
              // ignore
            }
          }

          // Prevent the browser from collapsing / blurring the
          // contentEditable span when the last character is deleted.
          if (event.key === "Backspace" || event.key === "Delete") {
            const text = input.textContent || "";
            const sel = window.getSelection();

            let wouldEmpty = false;
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              if (!range.collapsed) {
                // Selection covers all remaining text
                wouldEmpty = sel.toString().length >= text.length;
              } else {
                wouldEmpty = text.length <= 1;
              }
            } else {
              wouldEmpty = text.length <= 1;
            }

            if (wouldEmpty) {
              event.preventDefault();
              input.textContent = "";
              commit();
              // Restore caret inside the now-empty span
              try {
                const r = document.createRange();
                r.selectNodeContents(input);
                r.collapse(true);
                const s = window.getSelection();
                s.removeAllRanges();
                s.addRange(r);
              } catch {
                // ignore
              }
            }
            return;
          }

          // ArrowUp / ArrowDown: move the editor cursor to the
          // previous / next line instead of jumping to the
          // start / end of the input text.
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            commit();

            try {
              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos !== "number") return;

              const inputRect = input.getBoundingClientRect();
              const lineHeight =
                parseFloat(getComputedStyle(view.dom).lineHeight) || 20;

              const targetY =
                event.key === "ArrowUp"
                  ? inputRect.top - lineHeight
                  : inputRect.bottom + lineHeight;

              const result = view.posAtCoords({
                left: inputRect.left,
                top: targetY,
              });

              if (result) {
                const nodeAtPos = view.state.doc.nodeAt(pos);
                const nodeEnd = nodeAtPos
                  ? pos + nodeAtPos.nodeSize
                  : pos + 1;

                const isValid =
                  event.key === "ArrowUp"
                    ? result.pos < pos
                    : result.pos >= nodeEnd;

                if (isValid) {
                  const tr = view.state.tr.setSelection(
                    TextSelection.near(view.state.doc.resolve(result.pos)),
                  );
                  view.dispatch(tr);
                  view.focus();
                }
              }
            } catch {
              // ignore
            }
            return;
          }
        },
        { capture: true },
      );

      input.addEventListener("blur", () => {
        commit();
      });

      input.addEventListener("input", () => {
        commit();
      });

      input.addEventListener("mousedown", (event) => {
        event.stopPropagation();
      });

      widget.append(prefixText, input, suffixText);
      dom.append(widget, contentDOM);

      return {
        dom,
        contentDOM,
        stopEvent: (event) => {
          return input.contains(event.target);
        },
        // Tell ProseMirror to ignore DOM mutations that happen inside the
        // condition-input widget (the contentEditable span).  Without this,
        // ProseMirror's mutation observer sees the text change and tries to
        // reconcile the DOM, which steals focus / destroys the caret.
        ignoreMutation: (mutation) => {
          if (widget.contains(mutation.target)) return true;
          return false;
        },
        update: (nextNode) => {
          if (nextNode.type !== node.type) return false;
          node = nextNode;
          const nextCondition =
            nextNode.attrs?.condition ?? this.options.defaultCondition;
          dom.setAttribute("data-condition", nextCondition);

          // Avoid overwriting the text while the user is actively typing in it.
          if (
            document.activeElement !== input &&
            input.textContent !== nextCondition
          ) {
            input.textContent = nextCondition;
          }
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setConditionalInline:
        (condition) =>
        ({ editor, state, dispatch }) => {
          if (isInsideBlockConditional(state)) return false;

          const defaultCondition = this.options.defaultCondition;
          const nextCondition = (condition || "").trim() || defaultCondition;

          // Build the transaction from the `state` provided by the command
          // invocation and use the passed `dispatch` so the transaction is
          // applied against the same snapshot it was built for.
          const { from, to } = state.selection;
          const nodeType = state.schema.nodes[this.name];
          if (!nodeType) return false;

          const tr = state.tr;

          const focusConditionInput = (pos) => {
            try {
              const nodeDom = editor.view.nodeDOM(pos);
              const inputEl = nodeDom?.querySelector?.(
                "span.conditional-inline-condition-input[data-editor-focusable]",
              );
              if (!inputEl) return false;
              inputEl.focus?.();
              selectAllContents(inputEl);
              return true;
            } catch {
              return false;
            }
          };

          if (from !== to) {
            const slice = state.doc.slice(from, to).content;
            const wrapped = nodeType.create(
              { condition: nextCondition },
              slice,
            );
            tr.replaceRangeWith(from, to, wrapped);
            // Inserted via menubar/command: keep a text selection (so fast typing
            // can't replace/delete the whole node) and then focus the condition input.
            tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1), 1));
            if (typeof dispatch === "function") dispatch(tr);
            else editor.view.dispatch(tr);

            // Focus immediately if possible (avoids race where typing happens before focus).
            if (!focusConditionInput(from)) {
              requestAnimationFrame(() => focusConditionInput(from));
            }
            return true;
          }

          const wrapped = nodeType.create(
            { condition: nextCondition },
            state.schema.text("conditional text"),
          );
          tr.insert(from, wrapped);
          // Inserted via menubar/command: keep a text selection (so fast typing
          // can't replace/delete the whole node) and then focus the condition input.
          tr.setSelection(TextSelection.near(tr.doc.resolve(from + 1), 1));
          if (typeof dispatch === "function") dispatch(tr);
          else editor.view.dispatch(tr);

          if (!focusConditionInput(from)) {
            requestAnimationFrame(() => focusConditionInput(from));
          }
          return true;
        },

      toggleConditionalInline:
        (condition) =>
        ({ editor }) => {
          if (editor.isActive(this.name)) {
            return editor.commands.unsetConditionalInline();
          }
          return editor.commands.setConditionalInline(condition);
        },

      unsetConditionalInline:
        () =>
        ({ editor, state, dispatch }) => {
          const nodeType = state.schema.nodes[this.name];
          if (!nodeType) return false;

          const { selection } = state;
          const { $from } = selection;

          if (selection.node && selection.node.type === nodeType) {
            const tr = state.tr;
            tr.replaceWith(
              selection.from,
              selection.to,
              selection.node.content,
            );
            if (typeof dispatch === "function") dispatch(tr);
            else editor.view.dispatch(tr);
            return true;
          }

          for (let d = $from.depth; d > 0; d--) {
            const n = $from.node(d);
            if (n.type !== nodeType) continue;
            const pos = $from.before(d);
            const tr = state.tr;
            tr.replaceWith(pos, pos + n.nodeSize, n.content);
            if (typeof dispatch === "function") dispatch(tr);
            else editor.view.dispatch(tr);
            return true;
          }

          return false;
        },
    };
  },

  addKeyboardShortcuts() {
    const defaultCondition = this.options.defaultCondition;
    return {
      Enter: ({ editor }) => {
        const { state } = editor;
        const { $from } = state.selection;
        const nodeType = state.schema.nodes[this.name];
        if (!nodeType) return false;

        let condNode = null;
        for (let d = $from.depth; d > 0; d--) {
          const n = $from.node(d);
          if (n.type === nodeType) {
            condNode = n;
            break;
          }
        }
        if (!condNode) return false;

        const condition = condNode.attrs?.condition || defaultCondition;
        return convertToBlockConditional(editor, {
          inlineNodeType: nodeType,
          condition,
          splitAtCursor: true,
        });
      },
    };
  },

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey("conditionalInlineNodeArrowRight");
    const deleteKey = new PluginKey("conditionalInlineNodeDeleteSelection");
    return [
      new Plugin({
        key: pluginKey,
        props: {
          handleKeyDown: (view, event) => {
            if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
              return false;
            }
            const { state } = view;
            const { selection } = state;
            if (!selection.empty) return false;

            const $pos = state.doc.resolve(selection.from);
            const nodeType = state.schema.nodes[this.name];

            if (event.key === "ArrowRight") {
              // 1. Break out of node content: when at end of the content, move to after the node.
              try {
                for (let d = $pos.depth; d > 0; d--) {
                  const n = $pos.node(d);
                  if (n.type !== nodeType) continue;

                  const contentEnd = $pos.end(d);
                  if ($pos.pos !== contentEnd) break;

                  event.preventDefault();
                  event.stopPropagation();

                  const afterNodePos = $pos.after(d);
                  const tr = view.state.tr;
                  tr.setStoredMarks([]);

                  // If we are at the very end of the line, insert a space to give visual feedback
                  // and a place for the cursor to land outside the conditional node.
                  const $after = state.doc.resolve(afterNodePos);
                  const isAtEndOfBlock =
                    $after.parentOffset === $after.parent.content.size;

                  if (isAtEndOfBlock) {
                    tr.insertText(" ", afterNodePos);
                    tr.setSelection(
                      TextSelection.create(tr.doc, afterNodePos + 1),
                    );
                  } else {
                    tr.setSelection(TextSelection.create(tr.doc, afterNodePos));
                  }

                  view.dispatch(tr);

                  requestAnimationFrame(() => {
                    const nextPos = isAtEndOfBlock
                      ? afterNodePos + 1
                      : afterNodePos;
                    forceDomSelectionToPos(view, nextPos);
                    view.focus();
                  });
                  return true;
                }
              } catch {
                // ignore
              }

              // 2. Continuity: if we're at the end of a textblock and the *next* textblock
              // starts with a conditionalInline node, ArrowRight should jump straight
              // into the condition input.
              try {
                const atEndOfTextblock =
                  $pos.parent.isTextblock &&
                  $pos.parentOffset === $pos.parent.content.size;

                if (atEndOfTextblock) {
                  const afterTextblockPos = $pos.after();
                  const nextBlockStart = afterTextblockPos + 1;
                  if (nextBlockStart <= state.doc.content.size) {
                    const $nextStart = state.doc.resolve(nextBlockStart);
                    const nextFirstInline = $nextStart.nodeAfter;

                    if (nextFirstInline?.type === nodeType) {
                      event.preventDefault();

                      const tr = view.state.tr;
                      tr.setStoredMarks([]);
                      tr.setSelection(
                        TextSelection.create(tr.doc, nextBlockStart),
                      );
                      view.dispatch(tr);

                      requestAnimationFrame(() => {
                        try {
                          const nodeDom = view.nodeDOM(nextBlockStart);
                          const input = nodeDom?.querySelector?.(
                            "span.conditional-inline-condition-input[data-editor-focusable]",
                          );
                          if (!input) return;
                          input.focus?.();
                          setCaretToPos(input, 0);
                        } catch {
                          // ignore
                        }
                      });

                      return true;
                    }
                  }
                }
              } catch {
                // ignore
              }

              // 3. Before node -> inside input: When the caret is directly before the
              // conditional node, ArrowRight should focus the condition input (start).
              const nodeAfter = $pos.nodeAfter;
              if (nodeAfter && nodeAfter.type === nodeType) {
                event.preventDefault();

                setTimeout(() => {
                  try {
                    const nodeDom = view.nodeDOM(selection.from);
                    const input = nodeDom?.querySelector?.(
                      "span.conditional-inline-condition-input[data-editor-focusable]",
                    );
                    if (!input) return;
                    input.focus?.();
                    setCaretToPos(input, 0);
                  } catch {
                    // ignore
                  }
                }, 0);

                return true;
              }

              return false;
            }

            // ArrowLeft: when at start of the node content, move to the position
            // into the condition input. Only ArrowLeft from the *start of the input*
            // should exit the node to the position before it.
            try {
              for (let depth = $pos.depth; depth > 0; depth--) {
                const n = $pos.node(depth);
                if (n.type !== nodeType) continue;

                const nodePos = $pos.before(depth);
                const contentStart = $pos.start(depth);

                // First cursor position inside the node's content.
                if ($pos.pos !== contentStart) return false;

                event.preventDefault();
                event.stopPropagation();

                try {
                  const nodeDom = view.nodeDOM(nodePos);
                  const input = nodeDom?.querySelector?.(
                    "span.conditional-inline-condition-input[data-editor-focusable]",
                  );

                  if (input) {
                    requestAnimationFrame(() => {
                      input.focus?.();
                      const end = input.textContent?.length ?? 0;
                      setCaretToPos(input, end);
                    });
                    return true;
                  }

                  // Fallback: if we can't find the input DOM for some reason,
                  // at least allow exiting to before the node.
                  const tr = view.state.tr;
                  tr.setStoredMarks([]);
                  tr.setSelection(TextSelection.create(tr.doc, nodePos));
                  view.dispatch(tr);

                  requestAnimationFrame(() => {
                    forceDomSelectionToPos(view, nodePos);
                    view.focus();
                  });
                } catch {
                  // ignore
                }

                return true;
              }
            } catch {
              // ignore
            }

            return false;
          },
        },
      }),

      // When a selection endpoint lands exactly at the start/end of this node's
      // content (pos + 1 / pos + nodeSize - 1), ProseMirror will treat it as
      // "inside" the node, which can cause Backspace/Delete to leave the wrapper
      // node behind. Expand the deletion to include the full node in that case.
      new Plugin({
        key: deleteKey,
        props: {
          handleKeyDown(view, event) {
            if (event.key !== "Backspace" && event.key !== "Delete")
              return false;

            const { state } = view;
            const { selection } = state;
            if (!selection || selection.empty) return false;

            const inlineType = state.schema.nodes.conditionalInline;
            if (!inlineType) return false;

            const expandEdge = (edgePos, otherPos) => {
              const $pos = state.doc.resolve(edgePos);

              // Find the nearest ancestor conditionalInline node for this edge.
              for (let depth = $pos.depth; depth > 0; depth--) {
                const n = $pos.node(depth);
                if (n.type !== inlineType) continue;

                const nodePos = $pos.before(depth);
                const nodeEnd = nodePos + n.nodeSize;
                const contentStart = $pos.start(depth); // == nodePos + 1
                const contentEnd = $pos.end(depth); // == nodePos + nodeSize - 1

                const otherOutside = otherPos < nodePos || otherPos > nodeEnd;
                if (!otherOutside) return edgePos;

                if (edgePos === contentStart) return nodePos;
                if (edgePos === contentEnd) return nodeEnd;
                return edgePos;
              }

              return edgePos;
            };

            const otherFrom = selection.to;
            const otherTo = selection.from;
            const expandedFrom = expandEdge(selection.from, otherFrom);
            const expandedTo = expandEdge(selection.to, otherTo);

            const from = Math.min(expandedFrom, expandedTo);
            const to = Math.max(expandedFrom, expandedTo);

            if (from === selection.from && to === selection.to) return false;

            event.preventDefault();

            const tr = state.tr.deleteRange(from, to);
            tr.setSelection(TextSelection.near(tr.doc.resolve(from), -1));
            view.dispatch(tr);
            view.focus();
            return true;
          },
        },
      }),
    ];
  },

  addStorage() {
    const defaultCondition = this.options.defaultCondition;

    return {
      markdown: {
        serialize(state, node) {
          // Preserve intentionally empty conditions; only fall back for null/undefined.
          const condition = node.attrs.condition ?? defaultCondition;
          state.write(`((${condition}??`);
          // `tiptap-markdown` treats inline vs block rendering differently.
          // Using `renderInline` (when available) preserves inline marks like
          // **bold**, _italic_, and custom variable marks inside this node.
          if (typeof state.renderInline === "function") {
            state.renderInline(node);
          } else {
            state.renderContent(node);
          }
          state.write(`))`);
        },
        parse: {
          setup(markdownit) {
            markdownit.use((md) => {
              installConditionalInlineMarkdownIt(md, { defaultCondition });
            });
          },
        },
      },
    };
  },
});

export default ConditionalInlineNode;
