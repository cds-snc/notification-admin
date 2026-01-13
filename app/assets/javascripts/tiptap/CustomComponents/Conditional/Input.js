import { markInputRule, markPasteRule } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";

import {
  findRangeInTextblock,
  getMarkAtPos,
  hasSpaceAt,
  isInsideBlockConditional,
} from "./Helpers";
import { findConditionalMarks } from "./Decorations";
import { convertToBlockConditional } from "./Conversion";

export const createInputRules = (extension, markType) => {
  return [
    markInputRule({
      // Match ((condition??content)) pattern when typed inline
      // This will only trigger for single-line content
      find: /\(\(([^?)]+)\?\?([^)]*)\)\)$/,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || "condition").trim() || "condition",
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

export const createPasteRules = (extension, markType) => {
  return [
    markPasteRule({
      // Match single-line ((condition??content)) patterns during paste
      find: /\(\(([^?\n)]+)\?\?([^\n)]*)\)\)/g,
      type: markType,
      getAttributes: (match) => {
        return {
          condition: (match[1] || "condition").trim() || "condition",
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

export const createKeyboardShortcuts = (extension, markType) => {
  return {
    Enter: ({ editor }) => {
      const { state } = editor;
      const { $from } = state.selection;

      const mark = $from.marks().find((m) => m.type === markType);
      if (!mark) return false;

      const condition = mark.attrs.condition || "condition";
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

      const condition = mark.attrs.condition || "condition";

      // Check for heading patterns: # or ##
      if (/^#{1,6}$/.test(textBefore.trim())) {
        return convertToBlockConditional(editor, {
          markType,
          condition,
          splitAtCursor: false,
        });
      }

      // Check for list patterns: -, *, +, 1.
      if (/^[-*+]$/.test(textBefore.trim()) || /^\d+\.$/.test(textBefore.trim())) {
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
        const condition = mark.attrs.condition || "condition";
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
  const interactionKey = new PluginKey("conditionalInlineInteraction");

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
          return tr.docChanged ? findConditionalMarks(tr.doc, markType) : oldState;
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
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return false;

          const { state } = view;
          if (!state.selection.empty) return false;

          const cursorPos = state.selection.from;
          const storedMark = state.storedMarks?.find?.((m) => m.type === markType) || null;
          const markAtCursor = state.selection.$from.marks().find((m) => m.type === markType) || null;
          const markAhead = getMarkAtPos(state.doc, cursorPos + 1, markType);
          const markBehind =
            getMarkAtPos(state.doc, cursorPos - 1, markType) ||
            getMarkAtPos(state.doc, cursorPos - 2, markType);

          const interactionState = interactionKey.getState(state);
          const trackedSpaces = interactionState?.insertedSpaces || [];
          const isTrackedSpaceAt = (pos) => trackedSpaces.includes(pos) && hasSpaceAt(state.doc, pos);

          // Resolve the condition to use for range detection.
          const activeMark = markAtCursor || storedMark || markAhead || markBehind;
          if (!activeMark) return false;
          const condition = activeMark.attrs?.condition;
          if (!condition) return false;

          const range = findRangeInTextblock(state, markType, condition, cursorPos);
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
          if (!markAtCursor && !storedMark && cursorPos === range.from && markAhead) {
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
          if (markAtCursor && cursorPos === range.to && range.onlyThingOnLine) {
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
            getMarkAtPos(state.doc, pos + 1, markType) || getMarkAtPos(state.doc, pos, markType);
          if (!markAtPos) return;

          const condition = markAtPos.attrs?.condition;
          if (!condition) return;

          const range = findRangeInTextblock(state, markType, condition, pos);
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
        editorDom.addEventListener("conditionalInlineNavigate", handleNavigate);
        return {
          destroy() {
            editorDom.removeEventListener("conditionalInlineNavigate", handleNavigate);
          },
        };
      },
    }),
  ];
};
