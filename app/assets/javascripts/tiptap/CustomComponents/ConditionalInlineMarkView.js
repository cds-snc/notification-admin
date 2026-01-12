import React, { useEffect, useId, useRef, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../tiptap-ui-primitive/popover";

const normalizeCondition = (value) => {
  const trimmed = (value || "").trim();
  return trimmed || "condition";
};

const ConditionalInlineMarkPopover = ({ editor }) => {
  const inputId = useId();
  const [editState, setEditState] = useState(null); // { button, condition, from, to }
  const [draft, setDraft] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    // Listen for clicks on edit buttons in the decorations
    const handleClick = (event) => {
      const target = event.target;
      const btn = target.closest?.(".conditional-inline-edit-btn");

      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      const pos = parseInt(btn.getAttribute("data-pos"), 10);
      const condition = btn.getAttribute("data-condition") || "condition";

      if (isNaN(pos)) return;

      // Find the mark at this position
      const { state } = editor;
      const $pos = state.doc.resolve(pos);
      const mark = $pos
        .marks()
        .find((m) => m.type.name === "conditionalInline");

      if (!mark) return;

      // Find the full range of this mark
      let markFrom = pos;
      let markTo = pos;

      state.doc.nodesBetween(
        Math.max(0, pos - 500),
        Math.min(state.doc.content.size, pos + 500),
        (node, nodePos) => {
          if (node.isText) {
            const marks = node.marks.filter(
              (m) =>
                m.type.name === "conditionalInline" &&
                m.attrs.condition === condition,
            );
            if (marks.length > 0) {
              if (markFrom === pos || nodePos < markFrom) {
                markFrom = nodePos;
              }
              const endPos = nodePos + node.nodeSize;
              if (markTo === pos || endPos > markTo) {
                markTo = endPos;
              }
            }
          }
        },
      );

      // Find the DOM element containing the mark
      const markElement = btn.closest('span[data-type="conditional-inline"]');

      setEditState({ markElement, condition, from: markFrom, to: markTo });
      setDraft(condition);
    };

    const editorDom = editor.view.dom;
    editorDom.addEventListener("click", handleClick);

    return () => {
      editorDom.removeEventListener("click", handleClick);
    };
  }, [editor]);

  useEffect(() => {
    if (!editState) return;
    const id = setTimeout(() => {
      try {
        inputRef.current?.focus?.();
        inputRef.current?.select?.();
      } catch (e) {
        // ignore
      }
    }, 0);
    return () => clearTimeout(id);
  }, [editState]);

  const commitIfChanged = () => {
    if (!editState) return;

    const nextCondition = normalizeCondition(draft);
    const currentCondition = normalizeCondition(editState.condition);

    if (nextCondition === currentCondition) {
      setEditState(null);
      return;
    }

    // Update the mark in the editor
    const { from, to } = editState;
    const tr = editor.state.tr;

    tr.removeMark(from, to, editor.schema.marks.conditionalInline);
    tr.addMark(
      from,
      to,
      editor.schema.marks.conditionalInline.create({
        condition: nextCondition,
      }),
    );

    editor.view.dispatch(tr);
    setEditState(null);
  };

  const onOpenChange = (nextOpen) => {
    if (!nextOpen) {
      if (editState) {
        commitIfChanged();
      }
      setEditState(null);
    }
  };

  if (!editState) return null;

  return (
    <Popover open={true} onOpenChange={onOpenChange} modal={false}>
      <PopoverTrigger asChild>
        <button
          ref={(el) => {
            if (el && editState.markElement) {
              // Copy the position from the mark element
              const rect = editState.markElement.getBoundingClientRect();
              const parent = editor.view.dom.offsetParent || document.body;
              const parentRect = parent.getBoundingClientRect();

              el.style.position = "absolute";
              el.style.left = `${rect.right - parentRect.left}px`;
              el.style.top = `${rect.top - parentRect.top}px`;
              el.style.width = "1px";
              el.style.height = "1px";
              el.style.opacity = "0";
              el.style.pointerEvents = "none";
            }
          }}
          aria-hidden="true"
        />
      </PopoverTrigger>

      <PopoverContent
        side="right"
        align="start"
        className="conditional-popover"
      >
        <div className="conditional-popover-body">
          <label className="conditional-popover-label" htmlFor={inputId}>
            Edit Conditional
          </label>
          <input
            id={inputId}
            ref={inputRef}
            className="conditional-popover-input"
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              event.stopPropagation();

              if (event.key === "Escape") {
                event.preventDefault();
                setEditState(null);
                return;
              }

              if (event.key === "Enter") {
                event.preventDefault();
                commitIfChanged();
              }
            }}
          />
          <div className="conditional-popover-actions">
            <button
              type="button"
              className="conditional-popover-button"
              onClick={() => {
                commitIfChanged();
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ConditionalInlineMarkPopover;
