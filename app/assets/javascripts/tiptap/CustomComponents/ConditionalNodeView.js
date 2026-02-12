import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

const NAV_BLOCK_PARA_META = "__notifyConditionalBlockNavParagraph";
const RETURN_FOCUS_INPUT_META = "__notifyConditionalReturnFocusInput";

const ConditionalNodeView = ({
  node,
  updateAttributes,
  editor,
  getPos,
  extension,
}) => {
  const prefix = extension?.options?.prefix;
  const suffix = extension?.options?.suffix;
  const defaultCondition = extension?.options?.defaultCondition || "condition";
  const conditionAriaLabel =
    extension?.options?.conditionAriaLabel || "Condition";
  const conditionValue = useMemo(() => {
    const raw = node?.attrs?.condition;
    // Use the default only for legacy/missing attrs (null/undefined).
    return raw === null || raw === undefined ? defaultCondition : raw;
  }, [node?.attrs?.condition, defaultCondition]);

  const inputId = useId();
  const [draft, setDraft] = useState(conditionValue);
  const inputRef = useRef(null);

  // Keep draft in sync with attrs when not editing.
  useEffect(() => {
    // Only clobber the draft when the input isn't actively being edited.
    if (document.activeElement === inputRef.current) return;
    setDraft(conditionValue);
  }, [conditionValue]);

  const commitIfChanged = () => {
    const nextCondition = (draft || "").trim();
    const currentCondition = (conditionValue || "").trim();

    if (nextCondition === currentCondition) return;
    updateAttributes({ condition: nextCondition });
  };

  const requestToolbarFocus = () => {
    try {
      const doc = editor?.view?.dom?.ownerDocument || document;
      const toolbar = doc.querySelector('[data-testid="rte-toolbar"]');
      if (!toolbar) return;
      toolbar.dispatchEvent(
        new CustomEvent("rte-request-focus", { bubbles: true }),
      );
    } catch {
      // ignore
    }
  };

  const moveCursorIntoContentStart = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    try {
      const { state, view } = editor;
      const $start = state.doc.resolve(pos + 1);
      const selection = TextSelection.near($start, 1);
      const tr = state.tr.setSelection(selection).scrollIntoView();
      view.dispatch(tr);
    } catch {
      // Fall back to the previous behavior.
      editor.commands.setTextSelection(pos + 2);
    }
  };

  const moveCursorIntoContentEnd = () => {
    const pos = getPos();
    if (typeof pos !== "number") return;

    try {
      const { state, view } = editor;
      const inserted = state.doc.nodeAt(pos);
      if (!inserted) {
        moveCursorIntoContentStart();
        return;
      }

      const endOfContentPos = pos + inserted.nodeSize - 1;
      const selection = TextSelection.near(
        state.doc.resolve(endOfContentPos),
        -1,
      );
      const tr = state.tr.setSelection(selection).scrollIntoView();
      view.dispatch(tr);
    } catch {
      moveCursorIntoContentStart();
    }
  };

  return (
    <NodeViewWrapper
      as="div"
      className="conditional-block has-conditional-label"
      data-type="conditional"
      data-condition={conditionValue}
    >
      <div className="conditional-trigger" contentEditable={false}>
        <span className="conditional-trigger-text">{prefix}</span>
        <input
          id={inputId}
          ref={inputRef}
          data-editor-focusable="true"
          className="conditional-block-condition-input"
          type="text"
          value={draft}
          aria-label={conditionAriaLabel}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            // Don’t let ProseMirror handle keys originating from the input.
            event.stopPropagation();

            if (event.key === "Tab" && event.shiftKey) {
              event.preventDefault();
              commitIfChanged();
              try {
                const pos = getPos();
                if (typeof pos === "number") {
                  editor.view.dispatch(
                    editor.state.tr.setMeta(RETURN_FOCUS_INPUT_META, {
                      kind: "block",
                      pos,
                    }),
                  );
                }
              } catch {
                // ignore
              }
              requestToolbarFocus();
              return;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(conditionValue);
              editor.commands.focus();
              return;
            }

            if (event.key === "Enter") {
              event.preventDefault();
              commitIfChanged();
              editor.commands.focus();

              // Move into the conditional content after saving.
              moveCursorIntoContentStart();
            }

            if (event.key === "ArrowLeft") {
              const el = event.currentTarget;
              const atStart =
                typeof el?.selectionStart === "number" &&
                typeof el?.selectionEnd === "number" &&
                el.selectionStart === 0 &&
                el.selectionEnd === 0;

              if (atStart) {
                event.preventDefault();
                commitIfChanged();

                const pos = getPos();
                if (typeof pos !== "number") {
                  editor.commands.focus();
                  return;
                }

                const { state, view } = editor;
                const $pos = state.doc.resolve(pos);
                const nodeBefore = $pos.nodeBefore;

                // If there is no block above this conditional, insert an empty
                // paragraph so the cursor can exist before the node.
                if (!nodeBefore) {
                  const paraType = state.schema.nodes.paragraph;
                  if (!paraType) {
                    editor.commands.focus();
                    return;
                  }

                  const tr = state.tr.insert(pos, paraType.create());
                  tr.setMeta(NAV_BLOCK_PARA_META, pos);
                  tr.setSelection(TextSelection.create(tr.doc, pos + 1));
                  view.dispatch(tr);
                  editor.commands.focus();
                  return;
                }

                // Otherwise, move the cursor to the end of the previous block.
                editor.commands.focus();
                editor.commands.setTextSelection(pos - 1);
                return;
              }
            }

            if (event.key === "ArrowRight") {
              const el = event.currentTarget;
              const atEnd =
                typeof el?.selectionStart === "number" &&
                typeof el?.selectionEnd === "number" &&
                el.selectionStart === el.value.length &&
                el.selectionEnd === el.value.length;

              if (atEnd) {
                event.preventDefault();
                commitIfChanged();
                editor.commands.focus();

                moveCursorIntoContentStart();
              }
            }

            // ArrowUp / ArrowDown: move the editor cursor to the
            // previous / next line instead of jumping to the
            // start / end of the input text.
            if (event.key === "ArrowUp" || event.key === "ArrowDown") {
              event.preventDefault();
              commitIfChanged();

              const pos = getPos();
              if (typeof pos !== "number") return;

              try {
                const { state, view } = editor;
                const inputRect = event.currentTarget.getBoundingClientRect();
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
                  const isValid =
                    event.key === "ArrowUp"
                      ? result.pos < pos
                      : result.pos > pos;

                  if (isValid) {
                    const tr = state.tr.setSelection(
                      TextSelection.near(state.doc.resolve(result.pos)),
                    );
                    view.dispatch(tr);
                    editor.commands.focus();
                  }
                }
              } catch {
                // ignore
              }
              return;
            }

            // Tab should move focus into the conditional content.
            // Leave Shift+Tab to the browser so users can navigate backwards out of the input.
            if (event.key === "Tab" && !event.shiftKey) {
              event.preventDefault();
              commitIfChanged();
              editor.commands.focus();

              moveCursorIntoContentEnd();
            }
          }}
          onBlur={() => {
            commitIfChanged();
          }}
        />
        <span className="conditional-trigger-text" aria-hidden="true">
          {suffix}
        </span>
      </div>

      <div className="conditional-content">
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  );
};

export default ConditionalNodeView;
