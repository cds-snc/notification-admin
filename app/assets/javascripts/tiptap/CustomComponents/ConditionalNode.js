import { Node } from "@tiptap/core";
import {
  NodeSelection,
  Plugin,
  PluginKey,
  TextSelection,
} from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";

import ConditionalNodeView from "./ConditionalNodeView";
import { installConditionalBlockMarkdownIt } from "./Conditional/MarkdownIt";
import { focusConditionalInput } from "./Conditional/Helpers";

// A block node that conditionally renders template content.
// Example: ((under18??Please get your application signed by a parent or guardian.))
const ConditionalNode = Node.create({
  name: "conditional",

  // Allow this node to contain other content and nodes
  content: "block+",

  // Block level node, it can wrap other content
  group: "block",

  // Allow this node to be selected as a whole
  selectable: true,

  // Prevent the node from being filled with itself during auto-fill
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
        default: null,
        parseHTML: (element) => element.getAttribute("data-condition"),
        renderHTML: (attributes) => {
          if (
            attributes.condition === null ||
            attributes.condition === undefined
          ) {
            return {};
          }
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
        tag: 'div[data-type="conditional"]',
        getAttrs: (element) => ({
          condition: element.getAttribute("data-condition"),
        }),
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-type": "conditional",
        "data-condition": HTMLAttributes.condition || "",
        class: "conditional-block",
        ...HTMLAttributes,
      },
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ConditionalNodeView);
  },

  addProseMirrorPlugins() {
    /**
     * Plugin to auto-wrap text between standalone conditional markers into a conditional node.
     *
     * Example:
     * Various nodes, blocks or marks exist and the user manually types the conditional markers to wrap that
     * content in a conditional block:
     * ((condition?? <-- manually typed
     *   - lots of
     *   ((potential))
     *   # for additional
     *   [content](http://yes.com)
     * )) <-- manually typed
     */
    const conditionalType = this.type;
    const AUTO_WRAP_META = "__notifyConditionalAutoWrap";
    const NAV_BLOCK_PARA_META = "__notifyConditionalBlockNavParagraph";
    const navBlockParaKey = new PluginKey("notifyConditionalBlockNavParagraph");
    const RETURN_FOCUS_INPUT_META = "__notifyConditionalReturnFocusInput";
    const returnFocusInputKey = new PluginKey(
      "notifyConditionalReturnFocusInput",
    );

    const isInsideConditional = ($pos) => {
      for (let depth = $pos.depth; depth > 0; depth--) {
        if ($pos.node(depth).type === conditionalType) return true;
      }
      return false;
    };

    const selectionContainsConditional = (state) => {
      const { from, to } = state.selection;
      let found = false;

      state.doc.nodesBetween(from, to, (node) => {
        if (node.type === conditionalType) {
          found = true;
          return false;
        }
        return !found;
      });

      return found;
    };

    return [
      // Plugin: when the user Shift+Tabs from a conditional input to the toolbar,
      // the browser will Tab back into the editor at the current selection.
      // This plugin ensures the focus returns to the same conditional input instead
      // of landing in the conditional content.
      new Plugin({
        key: returnFocusInputKey,
        state: {
          init() {
            return { pos: null, kind: null };
          },
          apply(tr, prev) {
            let pos = prev?.pos ?? null;
            let kind = prev?.kind ?? null;

            const meta = tr.getMeta(RETURN_FOCUS_INPUT_META);
            if (meta === null) {
              pos = null;
              kind = null;
            } else if (meta && typeof meta.pos === "number") {
              pos = meta.pos;
              kind = meta.kind || null;
            }

            if (typeof pos === "number" && tr.docChanged) {
              pos = tr.mapping.map(pos, -1);
            }

            return { pos, kind };
          },
        },
        view(view) {
          let scheduled = false;

          const focusAndClear = () => {
            scheduled = false;
            try {
              const pluginState = returnFocusInputKey.getState(view.state);
              const pos = pluginState?.pos;
              const kind = pluginState?.kind;
              if (typeof pos !== "number") return;
              if (!view.hasFocus()) return;

              const nodeDom = view.nodeDOM(pos);
              focusConditionalInput(nodeDom, kind);

              // Clear so we don't refocus repeatedly.
              view.dispatch(
                view.state.tr.setMeta(RETURN_FOCUS_INPUT_META, null),
              );
            } catch {
              // ignore
            }
          };

          return {
            update(view) {
              const pluginState = returnFocusInputKey.getState(view.state);
              if (typeof pluginState?.pos !== "number") return;
              if (!view.hasFocus()) return;
              if (scheduled) return;

              scheduled = true;
              setTimeout(() => focusAndClear(), 0);
            },
          };
        },
      }),

      new Plugin({
        appendTransaction: (transactions, oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          if (transactions.some((tr) => tr.getMeta(AUTO_WRAP_META)))
            return null;

          // No nested conditionals, this aligns with the current conditional behaviour in notify
          if (isInsideConditional(newState.selection.$from)) return null;
          // Prevent wrapping of existing conditionals within another conditional
          if (selectionContainsConditional(newState)) return null;

          let startMarker = null;
          let endMarker = null;

          // We support a "wrapper" form where the markers are standalone paragraphs:
          // ((condition??
          // ...blocks...
          // ))
          newState.doc.descendants((node, pos) => {
            if (endMarker) return false;
            if (node.type.name !== "paragraph") return;

            const text = node.textContent || "";
            const trimmed = text.trim();

            if (!startMarker) {
              const match = trimmed.match(/^\(\(([^?]+)\?\?\s*$/);
              if (!match) return;

              const $start = newState.doc.resolve(pos);
              if (isInsideConditional($start)) return;

              startMarker = {
                pos,
                nodeSize: node.nodeSize,
                condition:
                  (match[1] || this.options.defaultCondition).trim() ||
                  this.options.defaultCondition,
              };
              return;
            }

            if (trimmed === "))") {
              endMarker = {
                pos,
                nodeSize: node.nodeSize,
                kind: "standalone",
              };
              return;
            }

            // Also support a close marker at the end of the final paragraph, eg:
            // ((cond??
            // some text))
            // This is common when typing, and should convert immediately.
            const trimmedEnd = text.trimEnd();
            if (
              trimmedEnd.endsWith(")") &&
              trimmedEnd.endsWith("))") &&
              trimmedEnd !== "))"
            ) {
              try {
                const paraEnd = pos + node.nodeSize - 1;

                // Skip trailing spaces at the very end of the paragraph.
                let endPos = paraEnd;
                while (
                  endPos > pos + 1 &&
                  newState.doc.textBetween(endPos - 1, endPos) === " "
                ) {
                  endPos -= 1;
                }

                // Ensure the last two non-space characters are literally "))".
                if (
                  endPos - 2 >= pos + 1 &&
                  newState.doc.textBetween(endPos - 2, endPos) === "))"
                ) {
                  endMarker = {
                    pos,
                    nodeSize: node.nodeSize,
                    kind: "inline",
                    closeFrom: endPos - 2,
                    closeTo: endPos,
                  };
                }
              } catch {
                // ignore
              }
            }
          });

          if (!startMarker || !endMarker) return null;
          if (endMarker.pos <= startMarker.pos) return null;

          const tr = newState.tr;

          // If the close marker is inline at the end of the paragraph, delete the
          // literal "))" characters first so they don't end up in the wrapped content.
          if (endMarker.kind === "inline") {
            tr.delete(endMarker.closeFrom, endMarker.closeTo);
          }

          const betweenFrom = startMarker.pos + startMarker.nodeSize;
          const betweenTo =
            endMarker.kind === "standalone"
              ? endMarker.pos
              : endMarker.pos + endMarker.nodeSize;

          const mappedBetweenFrom = tr.mapping.map(betweenFrom, 1);
          const mappedBetweenTo = tr.mapping.map(betweenTo, -1);

          // Extract the block content between markers.
          const slice = tr.doc.slice(mappedBetweenFrom, mappedBetweenTo);

          // Prevent nesting: if the wrapped content contains conditionals, do nothing.
          let containsConditional = false;
          slice.content.descendants((n) => {
            if (n.type === conditionalType) {
              containsConditional = true;
              return false;
            }
          });
          if (containsConditional) return null;

          const content =
            slice.content && slice.content.childCount
              ? slice.content
              : newState.schema.nodes.paragraph.create();

          const conditionalNode = conditionalType.create(
            { condition: startMarker.condition },
            content,
          );

          const replaceFrom = tr.mapping.map(startMarker.pos, 1);
          const replaceTo = tr.mapping.map(
            endMarker.pos + endMarker.nodeSize,
            -1,
          );

          tr.replaceWith(replaceFrom, replaceTo, conditionalNode);

          tr.setMeta(AUTO_WRAP_META, true);
          // Typed/pasted markers: keep focus in the conditional content, and place the
          // caret at the end of the existing content.
          try {
            const inserted = tr.doc.nodeAt(replaceFrom);
            if (inserted) {
              const endOfContentPos = replaceFrom + inserted.nodeSize - 1;
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(endOfContentPos), -1),
              );
            } else {
              tr.setSelection(
                TextSelection.near(tr.doc.resolve(replaceFrom + 1), 1),
              );
            }
          } catch {
            tr.setSelection(
              TextSelection.near(tr.doc.resolve(replaceFrom + 1), 1),
            );
          }
          tr.scrollIntoView();

          return tr;
        },
      }),

      // Plugin: document-order Tab navigation for embedded focusable controls.
      // This ensures Tab moves focus to controls that appear AFTER the cursor,
      // and Shift+Tab moves to controls BEFORE the cursor.
      new Plugin({
        props: {
          handleKeyDown(view, event) {
            // Block conditional: if you're at the beginning of the content and press ArrowLeft,
            // move into the condition input (caret at the end).
            if (
              event.key === "ArrowLeft" &&
              !event.shiftKey &&
              !event.altKey &&
              !event.metaKey
            ) {
              try {
                const { state } = view;
                const { selection } = state;
                if (!selection?.empty) return false;

                const { $from } = selection;

                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type !== conditionalType) continue;

                  const conditionalPos = $from.before(depth);
                  const contentStart = $from.start(depth);

                  // At the earliest caret position inside the conditional content.
                  if ($from.pos !== contentStart + 1) return false;

                  const nodeDom = view.nodeDOM(conditionalPos);
                  const input = nodeDom?.querySelector?.(
                    "input.conditional-block-condition-input",
                  );

                  if (!input) return false;

                  event.preventDefault();
                  input.focus?.();
                  const end = input.value?.length ?? 0;
                  input.setSelectionRange?.(end, end);
                  return true;
                }
              } catch {
                return false;
              }
            }

            if (event.key !== "Tab") return false;

            // When the cursor is inside a list item, let tiptap's built-in
            // ListItem keyboard shortcuts handle Tab (indent) and Shift+Tab
            // (dedent) instead of our custom focus-cycling logic.
            try {
              const { $from } = view.state.selection;
              const listItemType = view.state.schema.nodes?.listItem;
              if (listItemType) {
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type === listItemType) {
                    return false;
                  }
                }
              }
            } catch {
              // ignore – fall through to normal Tab handling
            }

            // Self-contained conditional Tab behavior:
            // - Cursor in conditional content + Tab: let browser move focus out of editor
            // - Cursor in conditional content + Shift+Tab: focus this conditional's input
            // - Cursor in inline conditional content + Shift+Tab: focus that inline input
            // This avoids the global focus-cycling logic jumping between unrelated conditionals.
            try {
              const { selection } = view.state;
              const { $from } = selection;
              const conditionalInlineNode =
                view.state.schema.nodes?.conditionalInline;

              const focusNextOutsideEditor = () => {
                try {
                  const doc = view.dom?.ownerDocument || document;
                  const editorRoot =
                    view.dom?.closest?.(".editor-wrapper") ||
                    view.dom?.closest?.('[data-testid="rte-editor"]') ||
                    view.dom;

                  const selector =
                    "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
                  const candidates = Array.from(
                    doc.querySelectorAll(selector),
                  ).filter((el) => {
                    if (!el) return false;
                    if (editorRoot && editorRoot.contains(el)) return false;
                    const style = doc.defaultView?.getComputedStyle?.(el);
                    if (
                      style?.display === "none" ||
                      style?.visibility === "hidden"
                    )
                      return false;
                    return true;
                  });

                  // Focus the first focusable element after the editor root in DOM order.
                  // We do this by scanning the full list and remembering the last index
                  // inside the editor wrapper.
                  const all = Array.from(doc.querySelectorAll(selector)).filter(
                    (el) => {
                      if (!el) return false;
                      const style = doc.defaultView?.getComputedStyle?.(el);
                      if (
                        style?.display === "none" ||
                        style?.visibility === "hidden"
                      )
                        return false;
                      return true;
                    },
                  );

                  let lastInsideIndex = -1;
                  for (let i = 0; i < all.length; i++) {
                    if (editorRoot && editorRoot.contains(all[i])) {
                      lastInsideIndex = i;
                    }
                  }

                  const next = all[lastInsideIndex + 1];
                  if (next) {
                    next.focus?.();
                    return next;
                  }

                  // Fallback: if we couldn't find a "next", focus the first outside candidate.
                  if (candidates[0]) {
                    candidates[0].focus?.();
                    return candidates[0];
                  }
                } catch {
                  // ignore
                }
                return null;
              };

              const bindShiftTabBackToConditionalContent = (nextEl, pos) => {
                if (!nextEl || typeof pos !== "number") return;

                const handler = (e) => {
                  if (e.key !== "Tab" || !e.shiftKey) return;
                  e.preventDefault();

                  try {
                    nextEl.removeEventListener("keydown", handler, true);
                  } catch {
                    // ignore
                  }

                  try {
                    const node = view.state.doc.nodeAt(pos);
                    if (!node) {
                      view.focus();
                      return;
                    }

                    const endOfContentPos = pos + node.nodeSize - 1;
                    const tr = view.state.tr.setSelection(
                      TextSelection.near(
                        view.state.doc.resolve(endOfContentPos),
                        -1,
                      ),
                    );
                    view.dispatch(tr);
                    view.focus();
                  } catch {
                    view.focus();
                  }
                };

                try {
                  nextEl.addEventListener("keydown", handler, true);
                } catch {
                  // ignore
                }
              };

              const findAncestorPos = (type) => {
                if (!type) return null;
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type === type) {
                    return $from.before(depth);
                  }
                }
                return null;
              };

              const blockConditionalPos = findAncestorPos(conditionalType);
              const inlineConditionalPos = findAncestorPos(
                conditionalInlineNode,
              );

              if (typeof blockConditionalPos === "number") {
                if (event.shiftKey) {
                  event.preventDefault();
                  const nodeDom = view.nodeDOM(blockConditionalPos);
                  const input = nodeDom?.querySelector?.(
                    "input.conditional-block-condition-input",
                  );
                  input?.focus?.();
                  try {
                    const end = input?.value?.length ?? 0;
                    input?.setSelectionRange?.(end, end);
                  } catch {
                    // ignore
                  }
                  return true;
                }

                // Forward Tab from conditional content should exit the editor,
                // not focus any other conditional inputs.
                event.preventDefault();
                const nextEl = focusNextOutsideEditor();
                bindShiftTabBackToConditionalContent(
                  nextEl,
                  blockConditionalPos,
                );
                return true;
              }

              if (typeof inlineConditionalPos === "number") {
                if (event.shiftKey) {
                  event.preventDefault();
                  const nodeDom = view.nodeDOM(inlineConditionalPos);
                  focusConditionalInput(nodeDom, "inline");
                  return true;
                }

                // Forward Tab from inline conditional content should exit the editor,
                // not cycle to other inputs.
                event.preventDefault();
                const nextEl = focusNextOutsideEditor();
                bindShiftTabBackToConditionalContent(
                  nextEl,
                  inlineConditionalPos,
                );
                return true;
              }
            } catch {
              // ignore
            }

            // Special case: temporary navigation space before an initial inline
            // conditional. The browser's default tab order can focus the inline
            // input without letting the inline plugin delete the space. Handle
            // Tab/Shift+Tab here deterministically.
            try {
              const { doc, selection } = view.state;
              const conditionalInline =
                view.state.schema.marks?.conditionalInline;

              if (conditionalInline && selection?.empty) {
                const pos = selection.from;
                const hasSpaceHere = doc.textBetween(pos, pos + 1) === " ";
                const next = doc.resolve(pos + 1).nodeAfter;
                const nextHasInline =
                  next?.isText &&
                  next.marks?.some((m) => m.type === conditionalInline);

                if (hasSpaceHere && nextHasInline) {
                  event.preventDefault();

                  if (event.shiftKey) {
                    // Shift+Tab -> toolbar
                    const toolbar = view.dom?.ownerDocument?.querySelector?.(
                      '[data-testid="rte-toolbar"]',
                    );
                    toolbar?.dispatchEvent?.(
                      new CustomEvent("rte-request-focus", { bubbles: true }),
                    );
                    return true;
                  }

                  // Tab -> delete space, then focus the inline input
                  const tr = view.state.tr;
                  tr.delete(pos, pos + 1);
                  tr.setSelection(
                    view.state.selection.constructor.near(tr.doc.resolve(pos)),
                  );
                  view.dispatch(tr);

                  setTimeout(() => {
                    try {
                      const input = view.dom?.querySelector?.(
                        "input.conditional-inline-condition-input[data-editor-focusable]",
                      );
                      input?.focus?.();
                      try {
                        const end = input?.value?.length ?? 0;
                        input?.setSelectionRange?.(end, end);
                      } catch {
                        // ignore
                      }
                    } catch {
                      // ignore
                    }
                  }, 0);

                  return true;
                }
              }
            } catch {
              // ignore
            }

            // Inline conditionals manage their own Tab/Shift+Tab behavior.
            // Avoid the global focus-cycling logic interfering.
            try {
              const conditionalInlineMark =
                view.state.schema.marks?.conditionalInline;
              const conditionalInlineNode =
                view.state.schema.nodes?.conditionalInline;

              const { selection } = view.state;
              const { $from } = selection;

              const isInInlineConditionalNode = (() => {
                if (!conditionalInlineNode) return false;
                if (selection?.node?.type === conditionalInlineNode)
                  return true;
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type === conditionalInlineNode)
                    return true;
                }
                return false;
              })();

              const isInInlineConditionalMark = (() => {
                if (!conditionalInlineMark) return false;
                const marksHere = $from?.marks?.() || [];
                return marksHere.some((m) => m.type === conditionalInlineMark);
              })();

              if (isInInlineConditionalNode || isInInlineConditionalMark) {
                return false;
              }
            } catch {
              // ignore
            }

            // When typing inside an inline conditional's content, forward Tab
            // should not cycle back to its embedded input widget.
            // Let the browser handle Tab to move focus out of the editor.
            if (!event.shiftKey) {
              const conditionalInlineMark =
                view.state.schema.marks?.conditionalInline;
              const conditionalInlineNode =
                view.state.schema.nodes?.conditionalInline;

              const { selection } = view.state;
              const { $from } = selection;

              const isInInlineConditionalNode = (() => {
                if (!conditionalInlineNode) return false;
                if (selection?.node?.type === conditionalInlineNode)
                  return true;
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type === conditionalInlineNode)
                    return true;
                }
                return false;
              })();

              const isInInlineConditionalMark = (() => {
                if (!conditionalInlineMark) return false;
                const marksHere = $from?.marks?.() || [];
                return marksHere.some((m) => m.type === conditionalInlineMark);
              })();

              if (isInInlineConditionalNode || isInInlineConditionalMark) {
                return false;
              }

              // If the user is positioned in the temporary leading space we add
              // to allow inserting before an initial inline conditional, don't
              // focus the inline input (that creates a loop between space/input).
              try {
                const { doc, selection } = view.state;
                if (selection?.empty && selection.from <= 2) {
                  const hasLeadingSpace = doc.textBetween(1, 2) === " ";
                  const next = doc.resolve(2).nodeAfter;
                  const nextHasInline =
                    conditionalInlineMark &&
                    next?.isText &&
                    next.marks?.some((m) => m.type === conditionalInlineMark);

                  if (hasLeadingSpace && nextHasInline) {
                    return false;
                  }
                }
              } catch {
                // ignore
              }
            }

            const editorDom = view.dom;
            // Find all focusable controls marked with our data attribute.
            const focusables = Array.from(
              editorDom.querySelectorAll("[data-editor-focusable]"),
            );
            if (focusables.length === 0) return false;

            // Map each focusable element to its ProseMirror document position.
            const withPos = focusables
              .map((el) => {
                try {
                  const pos = view.posAtDOM(el, 0);
                  return { el, pos };
                } catch {
                  return null;
                }
              })
              .filter(Boolean)
              .sort((a, b) => a.pos - b.pos);

            if (withPos.length === 0) return false;

            const cursorPos = view.state.selection.from;
            const shiftKey = event.shiftKey;

            let target = null;

            if (shiftKey) {
              // Shift+Tab: find the last focusable BEFORE cursor
              for (let i = withPos.length - 1; i >= 0; i--) {
                // If the caret is at the very start of a marked range, the
                // associated focusable (eg inline conditional input) can map to
                // the same ProseMirror position as the cursor.
                // Treat that as "before" for Shift+Tab.
                if (withPos[i].pos <= cursorPos) {
                  target = withPos[i].el;
                  break;
                }
              }
            } else {
              // Tab: find the first focusable AFTER cursor
              for (const item of withPos) {
                if (item.pos > cursorPos) {
                  target = item.el;
                  break;
                }
              }
            }

            if (target) {
              event.preventDefault();
              target.focus();
              return true;
            }

            // No target found in the desired direction → let browser handle
            // (moves focus out of editor).
            return false;
          },
        },
      }),

      // Plugin: temporary navigation paragraph for block conditional input.
      // When ArrowLeft at the beginning of the block condition input exits to
      // the previous line, and there is no previous line, we insert an empty
      // paragraph before the block. If ArrowRight is then pressed at the end
      // of that empty paragraph, delete it and re-focus the condition input
      // with caret at the start.
      new Plugin({
        key: navBlockParaKey,
        state: {
          init() {
            return { pos: null };
          },
          apply(tr, prev) {
            let pos = prev?.pos ?? null;

            const meta = tr.getMeta(NAV_BLOCK_PARA_META);
            if (meta === null) {
              pos = null;
            } else if (typeof meta === "number") {
              pos = meta;
            }

            if (typeof pos === "number" && tr.docChanged) {
              pos = tr.mapping.map(pos, -1);
            }

            // Validate that the tracked paragraph still exists, is empty, and
            // is immediately followed by a conditional block.
            if (typeof pos === "number") {
              const para = tr.doc.nodeAt(pos);
              if (
                !para ||
                para.type.name !== "paragraph" ||
                para.textContent !== "" ||
                para.nodeSize !== 2
              ) {
                pos = null;
              } else {
                const nextPos = pos + para.nodeSize;
                const nextNode = tr.doc.nodeAt(nextPos);
                if (!nextNode || nextNode.type !== conditionalType) {
                  pos = null;
                }
              }
            }

            return { pos };
          },
        },
        props: {
          handleKeyDown(view, event) {
            if (
              event.key !== "ArrowRight" ||
              event.shiftKey ||
              event.altKey ||
              event.metaKey
            ) {
              return false;
            }

            const pluginState = navBlockParaKey.getState(view.state);
            const navPos = pluginState?.pos;
            if (typeof navPos !== "number") return false;

            const { state } = view;
            const { selection } = state;
            if (!selection?.empty) return false;

            const para = state.doc.nodeAt(navPos);
            if (!para) return false;

            const paraEnd = navPos + para.nodeSize - 1;
            if (selection.from !== paraEnd) return false;

            const nextPos = navPos + para.nodeSize;
            const nextNode = state.doc.nodeAt(nextPos);
            if (!nextNode || nextNode.type !== conditionalType) return false;

            event.preventDefault();

            const tr = state.tr.delete(navPos, navPos + para.nodeSize);
            tr.setMeta(NAV_BLOCK_PARA_META, null);

            // Keep a stable editor selection (inside the conditional content)
            // while focus returns to the input. Avoid NodeSelection here because
            // other plugins may auto-focus the trigger button.
            const insideContentPos = Math.min(navPos + 2, tr.doc.content.size);
            tr.setSelection(TextSelection.create(tr.doc, insideContentPos));
            view.dispatch(tr);

            setTimeout(() => {
              try {
                const nodeDom = view.nodeDOM(navPos);
                const input = nodeDom?.querySelector?.(
                  "input.conditional-block-condition-input",
                );
                const setCaretStart = () => {
                  try {
                    input?.focus?.();
                    input?.setSelectionRange?.(0, 0);
                    if (input) input.scrollLeft = 0;
                  } catch {
                    // ignore
                  }
                };

                setCaretStart();
                requestAnimationFrame(() => setCaretStart());
              } catch {
                // ignore
              }
            }, 0);

            return true;
          },
        },
      }),

      // Plugin: auto-focus the conditional trigger when cursor moves to the node boundary.
      // When the user arrows into a conditional block (selection at node start),
      // we focus the trigger button so they can interact with it via keyboard.
      (() => {
        let lastInteractionWasMouse = false;

        return new Plugin({
          props: {
            handleDOMEvents: {
              mousedown() {
                // Mouse interactions should not trigger auto-focus to the input.
                // Otherwise clicking into an empty conditional's content will
                // immediately steal focus back to the trigger/input.
                try {
                  lastInteractionWasMouse = true;
                } catch {
                  // ignore
                }
                return false;
              },
            },
          },
          view() {
            let lastFocusedPos = null;
            let lastCursorPos = null;

            return {
              update(view, prevState) {
                const { state } = view;
                // Only act when selection changed
                if (prevState.selection.eq(state.selection)) {
                  return;
                }

                // If the selection change came from a mouse click/drag,
                // don't steal focus to the trigger.
                if (lastInteractionWasMouse) {
                  lastInteractionWasMouse = false;
                  return;
                }

                const { selection } = state;
                const { $from } = selection;
                const prevCursorPos = lastCursorPos;
                const currentCursorPos = $from.pos;
                lastCursorPos = currentCursorPos;

                // Helper to focus trigger at a given DOM pos
                const focusTriggerAtDomPos = (domPos) => {
                  const nodeDom = view.nodeDOM(domPos);
                  const trigger = nodeDom?.querySelector?.(
                    "[data-editor-focusable]",
                  );
                  if (!trigger) return false;

                  // If already focused, skip
                  if (document.activeElement === trigger) return true;

                  lastFocusedPos = domPos;
                  setTimeout(() => trigger.focus(), 0);
                  return true;
                };

                // Case A: NodeSelection of the conditional itself
                if (
                  selection instanceof NodeSelection &&
                  selection.node?.type?.name === "conditional"
                ) {
                  focusTriggerAtDomPos(selection.from);
                  return;
                }

                // Case B: Text cursor near the start of a conditional's content
                for (let depth = $from.depth; depth > 0; depth--) {
                  const node = $from.node(depth);
                  if (node.type.name !== "conditional") continue;

                  const conditionalDomPos = $from.before(depth);
                  // Try to compute the trigger's pos via the DOM element
                  const nodeDom = view.nodeDOM(conditionalDomPos);
                  const triggerEl = nodeDom?.querySelector?.(
                    "[data-editor-focusable]",
                  );

                  if (!triggerEl) break;

                  // Determine the trigger's document position
                  let triggerPos = null;
                  try {
                    triggerPos = view.posAtDOM(triggerEl, 0);
                  } catch (e) {
                    triggerPos = null;
                  }

                  const cursorPos = $from.pos;

                  // Determine navigation direction: true if moving forward, false if moving backward
                  const movingForward =
                    prevCursorPos === null || cursorPos > prevCursorPos;

                  // Only auto-focus trigger when moving forward into the conditional.
                  // When moving backward (from after the block), let cursor navigate into content first.
                  const shouldFocus =
                    movingForward &&
                    ((typeof triggerPos === "number" &&
                      cursorPos <= triggerPos) ||
                      cursorPos <= $from.start(depth) + 1);

                  if (shouldFocus) {
                    focusTriggerAtDomPos(conditionalDomPos);
                  } else if (lastFocusedPos === conditionalDomPos) {
                    // Cursor moved away from this conditional, blur the trigger
                    const nodeDomNow = view.nodeDOM(conditionalDomPos);
                    const triggerNow = nodeDomNow?.querySelector?.(
                      "[data-editor-focusable]",
                    );
                    if (triggerNow && document.activeElement === triggerNow) {
                      // Move focus back to editor so user continues typing
                      setTimeout(() => view.focus(), 0);
                    }
                    lastFocusedPos = null;
                  }

                  break;
                }
              },
            };
          },
        });
      })(),
      // Plugin: prevent nested conditional nodes by unwrapping inner ones.
      // This runs after transactions and replaces any `conditional` nodes
      // found inside another `conditional` with their content, preventing
      // nesting regardless of how they were inserted (paste/commands/plugins).
      new Plugin({
        key: new PluginKey("preventNestedConditionals"),
        appendTransaction(transactions, oldState, newState) {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          const found = [];

          // Collect ranges of conditional children that are nested inside a
          // parent conditional. We collect absolute positions relative to
          // `newState.doc` and sort descending before applying replacements so
          // earlier edits don't shift later positions.
          newState.doc.descendants((node, pos) => {
            if (node.type === conditionalType) {
              node.descendants((child, childPos) => {
                if (child.type === conditionalType) {
                  const absPos = pos + 1 + childPos; // child start inside parent
                  found.push({
                    pos: absPos,
                    size: child.nodeSize,
                    content: child.content,
                  });
                }
              });
            }
          });

          if (found.length === 0) return null;

          found.sort((a, b) => b.pos - a.pos);

          const tr = newState.tr;
          for (const r of found) {
            tr.replaceWith(r.pos, r.pos + r.size, r.content);
          }

          return tr;
        },
      }),
    ];
  },

  addStorage() {
    const defaultCondition = this.options.defaultCondition;

    return {
      markdown: {
        serialize(state, node) {
          const condition = node.attrs.condition || defaultCondition;

          // Serialize in a stable multi-line form so round-tripping through
          // Rich and markdown editors doesn't accidentally concatenate block boundaries.
          state.write(`((${condition}??`);
          state.ensureNewLine();
          const contentStart = state.out.length;
          state.renderContent(node);

          const outBeforeBody = state.out.slice(0, contentStart);
          const rawBody = state.out.slice(contentStart);
          const body = normalizeConditionalBodyMarkdown(rawBody);
          state.out = outBeforeBody + body;

          state.write(`))`);
          state.closeBlock(node);
        },
        parse: {
          setup(markdownit) {
            markdownit.use((md) => {
              // Custom block rule to parse multi-line block conditionals.
              // Single-line conditionals like ((condition??content)) within text
              // are handled by ConditionalInlineMark instead.
              installConditionalBlockMarkdownIt(md, { defaultCondition });
            });
          },
        },
      },
    };
  },

  addCommands() {
    return {
      // Command to insert/add a conditional block with a specific condition
      setConditional:
        (condition) =>
        ({ commands, editor }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          const nextCondition =
            (condition || "").trim() || this.options.defaultCondition;
          return commands.insertContent({
            type: this.name,
            attrs: { condition: nextCondition },
            content: [
              {
                type: "paragraph",
              },
            ],
          });
        },

      // Command to wrap selection in conditional block
      wrapInConditional:
        (condition) =>
        ({ commands, editor, state }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          // Also disallow wrapping content that already contains conditionals.
          let containsConditional = false;
          state.doc.nodesBetween(
            state.selection.from,
            state.selection.to,
            (n) => {
              if (n.type === this.type) {
                containsConditional = true;
                return false;
              }
            },
          );
          if (containsConditional) return false;

          const nextCondition =
            (condition || "").trim() || this.options.defaultCondition;

          const didWrap = commands.wrapIn(this.name, {
            condition: nextCondition,
          });
          if (!didWrap) return false;

          // Inserted via menubar/command: focus the condition input (placeholder condition).
          setTimeout(() => {
            try {
              const { view } = editor;
              const { selection } = editor.state;
              const { $from } = selection;

              let conditionalPos = null;
              for (let depth = $from.depth; depth > 0; depth--) {
                const n = $from.node(depth);
                if (n.type === this.type) {
                  conditionalPos = $from.before(depth);
                  break;
                }
              }

              if (typeof conditionalPos !== "number") return;

              const nodeDom = view.nodeDOM(conditionalPos);
              const inputEl = nodeDom?.querySelector?.(
                "[data-editor-focusable]",
              );
              if (!inputEl) return;
              inputEl.focus?.();
              inputEl.select?.();
            } catch {
              // ignore
            }
          }, 0);

          return true;
        },

      // Command to toggle the conditional block
      toggleConditional:
        (condition) =>
        ({ commands, editor, state }) => {
          const isActive = editor.isActive(this.name);

          if (isActive) {
            // We're inside a conditional block, so unwrap it
            return commands.lift(this.name);
          } else {
            // Do not allow nested conditionals.
            if (editor.isActive(this.name)) return false;
            // Also disallow wrapping content that already contains conditionals.
            let containsConditional = false;
            state.doc.nodesBetween(
              state.selection.from,
              state.selection.to,
              (n) => {
                if (n.type === this.type) {
                  containsConditional = true;
                  return false;
                }
              },
            );
            if (containsConditional) return false;
            // Not inside a conditional block, so wrap selection in one
            const nextCondition =
              (condition || "").trim() || this.options.defaultCondition;
            return commands.wrapIn(this.name, { condition: nextCondition });
          }
        },

      // Command to remove/unwrap the conditional block
      unsetConditional:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },

      // Command to insert a conditional block
      insertConditionalPattern:
        () =>
        ({ state, dispatch, editor }) => {
          // Do not allow nested conditionals.
          if (editor.isActive(this.name)) return false;

          const paragraph = state.schema.nodes.paragraph.create();
          const conditionalNode = this.type.create(
            { condition: this.options.defaultCondition },
            paragraph,
          );

          const tr = state.tr.replaceSelectionWith(conditionalNode);

          // Selection is placed after the inserted node; recover the node start.
          const insertedPos = tr.selection.from - conditionalNode.nodeSize;
          tr.setSelection(NodeSelection.create(tr.doc, insertedPos));
          tr.scrollIntoView();

          dispatch(tr);

          // Focus the condition input for quick editing.
          setTimeout(() => {
            try {
              const nodeDom =
                editor.view.nodeDOM(insertedPos) ||
                editor.view.nodeDOM(editor.state.selection.from);
              const inputEl = nodeDom?.querySelector?.(
                "[data-editor-focusable]",
              );
              if (!inputEl) return;

              inputEl.focus();
              inputEl.select?.();
            } catch (err) {
              // ignore
            }
          }, 0);

          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      ArrowUp: ({ editor }) => {
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;

        // Check if we're inside a conditional at or near the beginning
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name !== this.name) continue;

          const conditionalStart = $from.start(depth);
          const cursorPos = $from.pos;

          // If cursor is at or very close to the start of the conditional content
          // (within first few characters), prevent default up arrow and let the
          // auto-focus plugin handle focusing the trigger
          if (cursorPos <= conditionalStart + 3) {
            // Find and focus the trigger button
            setTimeout(() => {
              try {
                const conditionalDomPos = $from.before(depth);
                const nodeDom = editor.view.nodeDOM(conditionalDomPos);
                const triggerEl = nodeDom?.querySelector?.(
                  "[data-editor-focusable]",
                );
                if (triggerEl) {
                  triggerEl.focus();
                }
              } catch (err) {
                // Ignore
              }
            }, 0);
            return true; // Prevent default arrow behavior
          }
          break;
        }

        return false; // Allow default arrow behavior
      },
    };
  },
});

function normalizeConditionalBodyMarkdown(rendered) {
  // `state.renderContent` often emits block separators (`\n\n`) and sometimes
  // leading newlines depending on the first child block. For conditional blocks
  // we want a stable shape that round-trips cleanly between markdown and rich editor:
  // - body starts immediately after the newline following `??` (no blank line)
  // - body is either empty, or ends with exactly one trailing newline
  let body = String(rendered || "");

  // We always insert a newline after `??` ourselves, so remove any leading
  // newlines to avoid an extra blank line.
  body = body.replace(/^\n+/g, "");

  // If the body is effectively empty, keep it empty.
  if (body.trim() === "") return "";

  // Avoid trailing whitespace and normalize the ending to a single newline so
  // we don't end up with a blank line before the closing `))`.
  body = body.replace(/[\t ]+$/g, "");
  body = body.replace(/\n+$/g, "\n");
  return body;
}

export default ConditionalNode;
