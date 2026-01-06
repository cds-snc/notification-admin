import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { NodeViewContent, NodeViewWrapper } from "@tiptap/react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../../tiptap-ui-primitive/popover";

const normalizeCondition = (value) => {
  const trimmed = (value || "").trim();
  return trimmed;
};

const ConditionalNodeView = ({ node, updateAttributes, editor }) => {
  const inputId = useId();
  const conditionValue = useMemo(
    () => node?.attrs?.condition || "",
    [node?.attrs?.condition],
  );

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(conditionValue);
  const inputRef = useRef(null);

  // Keep draft in sync with attrs when not editing.
  useEffect(() => {
    if (open) return;
    setDraft(conditionValue);
  }, [conditionValue, open]);

  useEffect(() => {
    if (!open) return;
    // Defer focus until the popover content is mounted.
    const id = setTimeout(() => {
      try {
        inputRef.current?.focus?.();
        inputRef.current?.select?.();
      } catch (e) {
        // ignore
      }
    }, 0);

    return () => clearTimeout(id);
  }, [open]);

  const commitIfChanged = () => {
    const nextCondition = normalizeCondition(draft);
    const currentCondition = normalizeCondition(conditionValue);

    if (nextCondition === currentCondition) return;
    updateAttributes({ condition: nextCondition });
  };

  const onOpenChange = (nextOpen) => {
    // When closing, commit the draft.
    if (open && !nextOpen) {
      commitIfChanged();
    }

    setOpen(nextOpen);

    // When opening, ensure the draft reflects current attrs.
    if (nextOpen) {
      setDraft(conditionValue);
    }
  };

  const displayText = normalizeCondition(conditionValue) || "condition";

  return (
    <NodeViewWrapper
      as="div"
      className="conditional-block has-conditional-label"
      data-type="conditional"
      data-condition={conditionValue}
    >
      <Popover open={open} onOpenChange={onOpenChange} modal={false}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="conditional-trigger"
            aria-label="Edit conditional"
            onKeyDown={(event) => {
              // Prevent ProseMirror from interpreting delete keys while editing.
              if (event.key === "Backspace" || event.key === "Delete") {
                event.stopPropagation();
              }
            }}
          >
            <span className="conditional-trigger-text">{displayText}</span>
            <i
              aria-hidden="true"
              className="fa-solid fa-pen-to-square conditional-trigger-icon"
            ></i>
          </button>
        </PopoverTrigger>

        <PopoverContent
          side="bottom"
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
                    // Don’t let ProseMirror handle keys originating from the popover.
                    event.stopPropagation();

                    if (event.key === "Escape") {
                    event.preventDefault();
                    setDraft(conditionValue);
                    setOpen(false);
                    return;
                    }

                    if (event.key === "Enter") {
                    event.preventDefault();
                    commitIfChanged();
                    setOpen(false);
                    }
                }}
            />
            <div className="conditional-popover-actions">
              <button
                type="button"
                className="conditional-popover-button"
                onClick={() => {
                  commitIfChanged();
                  setOpen(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="conditional-content">
        <NodeViewContent as="div" />
      </div>
    </NodeViewWrapper>
  );
};

export default ConditionalNodeView;
