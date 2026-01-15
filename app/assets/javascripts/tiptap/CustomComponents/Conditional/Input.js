import { markInputRule, markPasteRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import { isInsideBlockConditional } from "./Helpers";
import { findConditionalMarks } from "./Decorations";
import { convertToBlockConditional } from "./Conversion";

export const createInputRules = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return [
    markInputRule({
      // Match ((condition??content)) pattern when typed inline
      // This will only trigger for single-line content
      find: /\(\(([^?)]+)\?\?([^)]*)\)\)$/,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || defaultCondition).trim() || defaultCondition,
        };
      },
    }),
  ].map((rule) => {
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
};

export const createPasteRules = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return [
    markPasteRule({
      // Match single-line ((condition??content)) patterns during paste
      find: /\(\(([^?\n)]+)\?\?([^\n)]*)\)\)/g,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || defaultCondition).trim() || defaultCondition,
        };
      },
    }),
  ].map((rule) => {
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
};

export const createKeyboardShortcuts = (_extension, markType) => {
  const defaultCondition = _extension?.options?.defaultCondition || "condition";
  return {
    Enter: ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      const condition = mark.attrs.condition || defaultCondition;
      return convertToBlockConditional(editor, {
        markType,
        condition,
        splitAtCursor: true,
      });
    },

    Space: ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      // Get the text before cursor in the current node
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 10),
        $from.parentOffset,
        null,
        "\ufffc",
      );

      const condition = mark.attrs.condition || defaultCondition;

      // Check for heading patterns: # or ##
      if (/^#{1,6}$/.test(textBefore.trim())) {
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      // Check for list patterns: -, *, +, 1.
      if (
        /^[-*+]$/.test(textBefore.trim()) ||
        /^\d+\.$/.test(textBefore.trim())
      ) {
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      return false;
    },

    "-": ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
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
        const condition = mark.attrs.condition || defaultCondition;
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      return false;
    },
  };
};

export const createPlugins = (extension, markType) => {
  const decorationsKey = new PluginKey("conditionalInlineDecorations");
  const NAV_SPACE_META = "__notifyConditionalInlineNavSpace";
  const defaultCondition = extension?.options?.defaultCondition || "condition";

  const normalizeCondition = (value) => {
    const trimmed = (value || "").trim();
    return trimmed || defaultCondition;
  };

  const getDecorationSet = (doc) =>
    findConditionalMarks(doc, markType, {
      prefix: extension?.options?.prefix,
      suffix: extension?.options?.suffix,
      defaultCondition: extension?.options?.defaultCondition,
      conditionAriaLabel: extension?.options?.conditionAriaLabel,
    });

  const isNavSpacePresent = (doc, pos) => {
    try {
      if (typeof pos !== "number") return false;
      if (doc.textBetween(pos, pos + 1) !== " ") return false;

      // The character after the space should be a text node that carries the conditional mark.
      const $afterSpace = doc.resolve(pos + 1);
      const next = $afterSpace.nodeAfter;

      if (!next?.isText) return false;
      return next.marks?.some((m) => m.type === markType) || false;
    } catch (e) {
      return false;
    }
  };

  const getToolbarEl = (view) => {
    const doc = view.dom?.ownerDocument || document;
    return doc.querySelector('[data-testid="rte-toolbar"]');
  };

  const focusToolbar = (view) => {
    try {
      const toolbar = getToolbarEl(view);
      if (!toolbar) return false;
      toolbar.dispatchEvent(
        new CustomEvent("rte-request-focus", { bubbles: true }),
      );
      return true;
    } catch (e) {
      return false;
    }
  };

  const focusInlineInputForCursor = (
    view,
    cursorPos,
    { caret = "end" } = {},
  ) => {
    try {
      const editorDom = view.dom;
      const inputs = Array.from(
        editorDom.querySelectorAll(
          "input.conditional-inline-condition-input[data-editor-focusable]",
        ),
      );
      if (inputs.length === 0) return false;

      const withPos = inputs
        .map((el) => {
          try {
            return { el, pos: view.posAtDOM(el, 0) };
          } catch {
            return null;
          }
        })
        .filter(Boolean)
        .sort((a, b) => a.pos - b.pos);

      // Choose the closest input at or before the cursor.
      let target = null;
      for (let i = withPos.length - 1; i >= 0; i--) {
        if (withPos[i].pos <= cursorPos) {
          target = withPos[i].el;
          break;
        }
      }

      if (!target) return false;
      target.focus();

      if (caret === "start") {
        target.setSelectionRange?.(0, 0);
      } else if (caret === "end") {
        const end = target.value.length;
        target.setSelectionRange?.(end, end);
      } else if (caret === "select") {
        target.select?.();
      }
      return true;
    } catch {
      return false;
    }
  };

  const findInlineConditionalRangeAtPos = (state, aroundPos) => {
    try {
      const $around = state.doc.resolve(aroundPos);
      const parentStart = $around.start();
      const parentEnd = $around.end();

      const mark =
        (state.storedMarks || []).find((m) => m.type === markType) ||
        $around.marks().find((m) => m.type === markType);
      if (!mark) return null;

      const condition = normalizeCondition(mark.attrs?.condition);

      const ranges = [];
      let current = null;

      state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
        if (!node.isText) return;

        const hasThisMark = node.marks.some(
          (m) =>
            m.type === markType &&
            normalizeCondition(m.attrs?.condition) === condition,
        );

        if (!hasThisMark) {
          if (current) {
            ranges.push(current);
            current = null;
          }
          return;
        }

        const from = pos;
        const to = pos + node.nodeSize;

        if (!current) {
          current = { from, to, markAttrs: mark.attrs };
          return;
        }

        if (from <= current.to) {
          current.to = Math.max(current.to, to);
        } else {
          ranges.push(current);
          current = { from, to, markAttrs: mark.attrs };
        }
      });

      if (current) ranges.push(current);

      return (
        ranges.find((r) => aroundPos >= r.from && aroundPos <= r.to) ||
        ranges.find((r) => aroundPos - 1 >= r.from && aroundPos - 1 <= r.to) ||
        null
      );
    } catch (e) {
      return null;
    }
  };

  return [
    new Plugin({
      key: decorationsKey,
      view(view) {
        const selector =
          "input.conditional-inline-condition-input[data-editor-focusable]";
        let startedInInput = false;

        const collapseSelectionInUnfocusedInputs = () => {
          try {
            const doc = view.dom?.ownerDocument || document;
            const active = doc.activeElement;

            const inputs = Array.from(view.dom.querySelectorAll(selector));
            for (const input of inputs) {
              if (input === active) continue;
              try {
                const end = input.value?.length ?? 0;
                input.setSelectionRange?.(end, end);
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        };
        const isWithinInput = (target) => {
          try {
            return (
              target?.closest?.(selector) ||
              (target?.nodeType === 3 &&
                target?.parentElement?.closest?.(selector))
            );
          } catch {
            return false;
          }
        };

        const clearInlineInputSelections = () => {
          try {
            const inputs = Array.from(view.dom.querySelectorAll(selector));
            for (const input of inputs) {
              try {
                const end = input.value?.length ?? 0;
                input.setSelectionRange?.(end, end);
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        };

        const onMouseDown = (event) => {
          // If the user starts selecting in the editor content (not inside the
          // condition input), collapse any existing input selection so it can't
          // appear "highlighted" alongside the editor selection.
          if (event?.button !== 0) return;
          startedInInput = !!isWithinInput(event?.target);
          if (startedInInput) return;
          clearInlineInputSelections();
        };

        const onMouseUp = (event) => {
          // Don't clobber a selection the user was making in the input.
          // Only clear if the interaction started outside the input.
          if (startedInInput) {
            startedInInput = false;
            return;
          }
          startedInInput = false;

          if (isWithinInput(event?.target)) return;
          clearInlineInputSelections();
        };

        view.dom.addEventListener("mousedown", onMouseDown, true);
        view.dom.addEventListener("mouseup", onMouseUp, true);

        return {
          update(nextView, prevState) {
            try {
              if (!prevState) return;
              if (prevState.selection.eq(nextView.state.selection)) return;

              const doc = nextView.dom?.ownerDocument || document;
              const active = doc.activeElement;

              // If a condition input is focused and the editor selection changes
              // (eg mouse drag selecting content), forcibly blur the input.
              // This prevents the input's own text selection highlight from
              // visually "bleeding" into the editor selection.
              if (active?.matches?.(selector)) {
                try {
                  const end = active.value?.length ?? 0;
                  active.setSelectionRange?.(end, end);
                } catch {
                  // ignore
                }
                active.blur?.();
              }

              // Even when the input is NOT focused, some browsers can still
              // render a stale selection highlight in the input from a previous
              // keyboard navigation step. Collapse selection in all unfocused
              // condition inputs whenever the editor selection changes.
              collapseSelectionInUnfocusedInputs();
            } catch {
              // ignore
            }
          },
          destroy() {
            view.dom.removeEventListener("mousedown", onMouseDown, true);
            view.dom.removeEventListener("mouseup", onMouseUp, true);
          },
        };
      },
      state: {
        init(_, { doc }) {
          return {
            decorations: getDecorationSet(doc),
            navSpacePos: null,
          };
        },
        apply(tr, oldState) {
          const decorations = tr.docChanged
            ? getDecorationSet(tr.doc)
            : oldState.decorations;

          let navSpacePos = oldState.navSpacePos;
          const meta = tr.getMeta(NAV_SPACE_META);

          if (typeof meta === "number") navSpacePos = meta;
          if (meta === null) navSpacePos = null;

          // If something else changed the document, confirm the nav space still
          // exists. If the user typed anything before the conditional, this
          // will turn false and we won't auto-delete anything.
          if (tr.docChanged && typeof navSpacePos === "number") {
            if (!isNavSpacePresent(tr.doc, navSpacePos)) {
              navSpacePos = null;
            }
          }

          return { decorations, navSpacePos };
        },
      },
      props: {
        decorations(state) {
          return decorationsKey.getState(state)?.decorations;
        },
        handleKeyDown(view, event) {
          const key = event.key;
          const isTab = key === "Tab";
          const isArrowLeft = key === "ArrowLeft";
          const isArrowRight = key === "ArrowRight";

          if (!isTab && !isArrowLeft && !isArrowRight) return false;

          const { state } = view;
          const { selection } = state;

          if (!selection.empty) return false;

          const pluginState = decorationsKey.getState(state);
          const cursorPos = selection.from;

          // If we're sitting on a navigation space we inserted, treat it as part
          // of the inline conditional's self-contained keyboard model.
          if (
            typeof pluginState?.navSpacePos === "number" &&
            isNavSpacePresent(state.doc, pluginState.navSpacePos)
          ) {
            const navPos = pluginState.navSpacePos;

            if (isArrowRight && cursorPos === navPos) {
              event.preventDefault();

              const tr = state.tr;
              tr.delete(navPos, navPos + 1);
              tr.setMeta(NAV_SPACE_META, null);
              tr.setSelection(
                selection.constructor.near(tr.doc.resolve(navPos)),
              );
              view.dispatch(tr);

              // Re-enter via the input (not the content) so keyboard flow is:
              // nav-space -> input -> content.
              setTimeout(() => {
                focusInlineInputForCursor(view, navPos, { caret: "start" });
              }, 0);
              return true;
            }

            if (isTab && cursorPos === navPos) {
              event.preventDefault();

              if (event.shiftKey) {
                focusToolbar(view);
                return true;
              }

              // Forward Tab from the navigation space should enter the input,
              // but first remove the temporary space so positions don't drift
              // and Tab doesn't loop between space/input.
              const tr = state.tr;
              tr.delete(navPos, navPos + 1);
              tr.setMeta(NAV_SPACE_META, null);
              tr.setSelection(
                selection.constructor.near(tr.doc.resolve(navPos)),
              );
              view.dispatch(tr);

              // Focus after the view updates.
              setTimeout(() => {
                focusInlineInputForCursor(view, navPos);
              }, 0);
              return true;
            }
          }

          // Handle Tab/Shift+Tab in inline conditional content.
          const range =
            findInlineConditionalRangeAtPos(state, cursorPos) ||
            findInlineConditionalRangeAtPos(state, cursorPos + 1);

          if (isTab && range) {
            // 2. On content? Shift+Tab -> focus input.
            if (event.shiftKey) {
              event.preventDefault();
              focusInlineInputForCursor(view, cursorPos);
              return true;
            }

            // 3.B. Behind first char? Tab -> focus input.
            if (cursorPos === range.from) {
              event.preventDefault();
              focusInlineInputForCursor(view, cursorPos);
              return true;
            }

            return false;
          }

          // Handle ArrowLeft/ArrowRight at the start of inline content.
          if (!isArrowLeft && !isArrowRight) return false;
          if (!range) return false;

          if (isArrowRight) {
            // 3.A. ArrowRight -> move back into content (default behavior).
            return false;
          }

          // ArrowLeft only: when at the very beginning of the inline content,
          // move into the condition input (caret at end).
          if (cursorPos !== range.from) return false;

          event.preventDefault();
          focusInlineInputForCursor(view, cursorPos, { caret: "end" });
          return true;
        },
      },
    }),
  ];
};
