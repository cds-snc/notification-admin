import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";

const NAV_BLOCK_PARA_META = "__notifyConditionalBlockNavParagraph";

const normalizeCondition = (value, defaultCondition) => {
  const trimmed = (value || "").trim();
  return trimmed || defaultCondition;
};

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
  const conditionValue = useMemo(
    () => node?.attrs?.condition || "",
    [node?.attrs?.condition],
  );

  const inputId = useId();
  const [draft, setDraft] = useState(
    normalizeCondition(conditionValue, defaultCondition),
  );
  const inputRef = useRef(null);

  // Keep draft in sync with attrs when not editing.
  useEffect(() => {
    // Only clobber the draft when the input isn't actively being edited.
    if (document.activeElement === inputRef.current) return;
    setDraft(normalizeCondition(conditionValue, defaultCondition));
  }, [conditionValue, defaultCondition]);

  const commitIfChanged = () => {
    const nextCondition = normalizeCondition(draft, defaultCondition);
    const currentCondition = normalizeCondition(
      conditionValue,
      defaultCondition,
    );

    if (nextCondition === currentCondition) return;
    updateAttributes({ condition: nextCondition });
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

  return (
    <NodeViewWrapper
      as="div"
      className="conditional-block has-conditional-label"
      data-type="conditional"
      data-condition={conditionValue}
    >
      <div className="conditional-trigger" contentEditable={false}>
        <span className="conditional-trigger-text">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 384 512"
            aria-hidden="true"
            focusable="false"
            className="conditional-inline-branch-icon"
          >
            <path
              fill="currentColor"
              d="M384 144c0-44.2-35.8-80-80-80s-80 35.8-80 80c0 36.4 24.3 67.1 57.5 76.8-.6 16.1-4.2 28.5-11 36.9-15.4 19.2-49.3 22.4-85.2 25.7-28.2 2.6-57.4 5.4-81.3 16.9v-144c32.5-10.2 56-40.5 56-76.3 0-44.2-35.8-80-80-80S0 35.8 0 80c0 35.8 23.5 66.1 56 76.3v199.3C23.5 365.9 0 396.2 0 432c0 44.2 35.8 80 80 80s80-35.8 80-80c0-34-21.2-63.1-51.2-74.6 3.1-5.2 7.8-9.8 14.9-13.4 16.2-8.2 40.4-10.4 66.1-12.8 42.2-3.9 90-8.4 118.2-43.4 14-17.4 21.1-39.8 21.6-67.9 31.6-10.8 54.4-40.7 54.4-75.9zM80 64c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm0 384c-8.8 0-16-7.2-16-16s7.2-16 16-16 16 7.2 16 16-7.2 16-16 16zm224-320c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16z"
            />
          </svg>
          {prefix}
        </span>
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

            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(normalizeCondition(conditionValue, defaultCondition));
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

            // Tab should move focus into the conditional content.
            // Leave Shift+Tab to the browser so users can navigate backwards out of the input.
            if (event.key === "Tab" && !event.shiftKey) {
              event.preventDefault();
              commitIfChanged();
              editor.commands.focus();

              moveCursorIntoContentStart();
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
