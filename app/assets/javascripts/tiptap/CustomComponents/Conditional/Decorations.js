import { Decoration, DecorationSet } from "@tiptap/pm/view";

const normalizeCondition = (value, defaultCondition) => {
  const trimmed = (value || "").trim();
  return trimmed || defaultCondition;
};

const findMarkRangeInParent = (
  state,
  markType,
  condition,
  aroundPos,
  defaultCondition,
) => {
  const $around = state.doc.resolve(aroundPos);
  const parentStart = $around.start();
  const parentEnd = $around.end();

  const ranges = [];
  let current = null;

  state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
    if (!node.isText) return;

    const hasThisMark = node.marks.some(
      (m) =>
        m.type === markType &&
        normalizeCondition(m.attrs?.condition, defaultCondition) === condition,
    );

    if (!hasThisMark) {
      if (current) {
        ranges.push(current);
        current = null;
      }
      return;
    }

    const nodeFrom = pos;
    const nodeTo = pos + node.nodeSize;

    if (!current) {
      current = { from: nodeFrom, to: nodeTo };
      return;
    }

    if (nodeFrom <= current.to) {
      current.to = Math.max(current.to, nodeTo);
    } else {
      ranges.push(current);
      current = { from: nodeFrom, to: nodeTo };
    }
  });

  if (current) ranges.push(current);

  const pos = aroundPos;
  return (
    ranges.find((r) => pos >= r.from && pos <= r.to) ||
    ranges.find((r) => pos - 1 >= r.from && pos - 1 <= r.to) ||
    null
  );
};

// Helper function to find all conditional inline marks and create widget decorations
export function findConditionalMarks(
  doc,
  markType,
  {
    prefix,
    suffix,
    defaultCondition = "condition",
    conditionAriaLabel = "Condition",
  } = {},
) {
  const decorations = [];
  const createdAt = new Set();

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const marks = node.marks.filter((m) => m.type === markType);
    if (marks.length === 0) return;

    // For each conditional mark, add a widget at the beginning of that mark range.
    for (const mark of marks) {
      let condition = normalizeCondition(
        mark.attrs?.condition,
        defaultCondition,
      );

      const markMatchesCondition = (m) =>
        m.type === markType &&
        normalizeCondition(m.attrs?.condition, defaultCondition) === condition;

      // Find the specific mark instance range containing this pos.
      // We intentionally do this instead of relying on mark object identity.
      const range = (() => {
        try {
          // `pos` points at this text node; use the resolved state later in the widget
          // for correctness, but use this doc for de-duping by `from`.
          const $pos = doc.resolve(pos);
          const parentStart = $pos.start();
          const parentEnd = $pos.end();

          const ranges = [];
          let current = null;

          doc.nodesBetween(parentStart, parentEnd, (n, p) => {
            if (!n.isText) return;
            const hasThisMark = n.marks.some(markMatchesCondition);

            if (!hasThisMark) {
              if (current) {
                ranges.push(current);
                current = null;
              }
              return;
            }

            const from = p;
            const to = p + n.nodeSize;

            if (!current) {
              current = { from, to };
              return;
            }

            if (from <= current.to) {
              current.to = Math.max(current.to, to);
            } else {
              ranges.push(current);
              current = { from, to };
            }
          });

          if (current) ranges.push(current);

          return (
            ranges.find((r) => pos >= r.from && pos <= r.to) ||
            ranges.find((r) => pos - 1 >= r.from && pos - 1 <= r.to) ||
            null
          );
        } catch (e) {
          return null;
        }
      })();

      if (!range) continue;
      if (createdAt.has(range.from)) continue;
      createdAt.add(range.from);

      decorations.push(
        Decoration.widget(
          range.from,
          (view, getPos) => {
            const fallbackRange = { from: range.from, to: range.to };

            const widget = document.createElement("span");
            widget.className = "conditional-inline-edit-widget";
            widget.setAttribute("contenteditable", "false");

            const prefixText = document.createElement("span");
            prefixText.className = "conditional-inline-edit-prefix";

            const branchIcon = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "svg",
            );
            branchIcon.setAttribute("viewBox", "0 0 384 512");
            branchIcon.setAttribute("aria-hidden", "true");
            branchIcon.setAttribute("focusable", "false");
            branchIcon.classList.add("conditional-inline-branch-icon");

            const branchIconPath = document.createElementNS(
              "http://www.w3.org/2000/svg",
              "path",
            );
            branchIconPath.setAttribute(
              "d",
              "M384 144c0-44.2-35.8-80-80-80s-80 35.8-80 80c0 36.4 24.3 67.1 57.5 76.8-.6 16.1-4.2 28.5-11 36.9-15.4 19.2-49.3 22.4-85.2 25.7-28.2 2.6-57.4 5.4-81.3 16.9v-144c32.5-10.2 56-40.5 56-76.3 0-44.2-35.8-80-80-80S0 35.8 0 80c0 35.8 23.5 66.1 56 76.3v199.3C23.5 365.9 0 396.2 0 432c0 44.2 35.8 80 80 80s80-35.8 80-80c0-34-21.2-63.1-51.2-74.6 3.1-5.2 7.8-9.8 14.9-13.4 16.2-8.2 40.4-10.4 66.1-12.8 42.2-3.9 90-8.4 118.2-43.4 14-17.4 21.1-39.8 21.6-67.9 31.6-10.8 54.4-40.7 54.4-75.9zM80 64c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16zm0 384c-8.8 0-16-7.2-16-16s7.2-16 16-16 16 7.2 16 16-7.2 16-16 16zm224-320c8.8 0 16 7.2 16 16s-7.2 16-16 16-16-7.2-16-16 7.2-16 16-16z",
            );
            branchIconPath.setAttribute("fill", "currentColor");
            branchIcon.appendChild(branchIconPath);

            prefixText.append(
              branchIcon,
              document.createTextNode(prefix || "IF "),
            );

            const input = document.createElement("input");
            input.className = "conditional-inline-condition-input";
            input.type = "text";
            input.value = condition;
            input.setAttribute("data-editor-focusable", "true");
            input.setAttribute("aria-label", conditionAriaLabel);
            input.setAttribute("autocomplete", "off");
            input.setAttribute("spellcheck", "false");

            const suffixText = document.createElement("span");
            suffixText.className = "conditional-inline-edit-suffix";
            suffixText.textContent = suffix || " is YES";

            const commit = ({ moveCursorToContentStart = false } = {}) => {
              const nextCondition = normalizeCondition(
                input.value,
                defaultCondition,
              );

              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos !== "number") return;

              const markRange = findMarkRangeInParent(
                view.state,
                markType,
                condition,
                pos,
                defaultCondition,
              );
              const effectiveRange =
                markRange ||
                (view.state.doc.rangeHasMark(
                  fallbackRange.from,
                  fallbackRange.to,
                  markType,
                )
                  ? fallbackRange
                  : null);

              if (!effectiveRange) return;

              // If nothing changed, avoid a doc-changing transaction (which can
              // rebuild decorations and bounce focus). Still allow moving the
              // caret into the content when requested.
              if (nextCondition === condition) {
                if (!moveCursorToContentStart) return;

                const targetPos = Math.min(pos, effectiveRange.to - 1);
                const tr = view.state.tr;
                tr.setSelection(
                  view.state.selection.constructor.near(
                    tr.doc.resolve(targetPos),
                  ),
                );
                tr.setStoredMarks([markType.create({ condition: nextCondition })]);
                view.dispatch(tr);
                return;
              }

              const { tr } = view.state;
              tr.removeMark(effectiveRange.from, effectiveRange.to, markType);
              tr.addMark(
                effectiveRange.from,
                effectiveRange.to,
                markType.create({ condition: nextCondition }),
              );

              // Keep selection as-is (blur) or move it into the mark content (Enter)
              if (moveCursorToContentStart) {
                // ProseMirror positions are between characters; `markRange.from`
                // is the position *before* the first character of the marked content.
                // We want the caret at the beginning of the content (same as the
                // block conditional), not after the first character.
                const targetPos = Math.min(pos, effectiveRange.to - 1);

                tr.setSelection(
                  view.state.selection.constructor.near(
                    tr.doc.resolve(targetPos),
                  ),
                );
                tr.setStoredMarks([
                  markType.create({ condition: nextCondition }),
                ]);
              }

              view.dispatch(tr);

              // If we committed a new condition, update our local reference so
              // subsequent commits map to the updated mark instance.
              // (Decorations will rebuild on docChanged too, but this keeps things stable.)
              if (nextCondition !== condition) {
                condition = nextCondition;
                input.value = nextCondition;
              }
            };

            const requestToolbarFocus = () => {
              try {
                const doc = view.dom?.ownerDocument || document;
                const toolbar = doc.querySelector('[data-testid="rte-toolbar"]');
                if (!toolbar) return;

                // Force focus onto the toolbar container first so focus doesn't
                // snap back to the editor selection.
                try {
                  const prevTabIndex = toolbar.getAttribute("tabindex");
                  toolbar.tabIndex = -1;
                  toolbar.focus();
                  if (prevTabIndex === null) toolbar.removeAttribute("tabindex");
                  else toolbar.setAttribute("tabindex", prevTabIndex);
                } catch {
                  // ignore
                }

                // Preferred: ask AccessibleToolbar to focus its current item.
                try {
                  toolbar.dispatchEvent(
                    new CustomEvent("rte-request-focus", { bubbles: true }),
                  );
                  return;
                } catch {
                  // fall through
                }

                // Fallback: focus the first focusable element in the toolbar.
                const focusableSelectors = [
                  "button:not([disabled])",
                  "[href]:not([disabled])",
                  "input:not([disabled])",
                  "select:not([disabled])",
                  "textarea:not([disabled])",
                  "[tabindex]:not([tabindex='-1']):not([disabled])",
                  "[role='button']:not([disabled])",
                ].join(", ");

                const first = toolbar.querySelector(focusableSelectors);
                first?.focus?.();
              } catch (e) {
                // ignore
              }
            };

            input.addEventListener(
              "keydown",
              (event) => {
                // Intercept in capture phase so the browser doesn't move focus
                // before we can handle Shift+Tab.
                event.stopPropagation();
                event.stopImmediatePropagation?.();

                // Shift+Tab from the input should move focus to the toolbar (menu),
                // not back into the conditional content.
                if (event.key === "Tab" && event.shiftKey) {
                  event.preventDefault();
                  // Focus toolbar immediately, then again on the next tick to
                  // outlast any editor-selection restoration.
                  requestToolbarFocus();
                  setTimeout(() => requestToolbarFocus(), 0);
                  return;
                }

                // Tab should move focus into the conditional content (like the block conditional).
                if (event.key === "Tab" && !event.shiftKey) {
                  event.preventDefault();
                  commit({ moveCursorToContentStart: true });
                  setTimeout(() => view.focus(), 0);
                  return;
                }

                if (event.key === "Enter") {
                  event.preventDefault();
                  commit({ moveCursorToContentStart: true });
                  setTimeout(() => view.focus(), 0);
                }
              },
              { capture: true },
            );

            input.addEventListener("blur", () => {
              commit({ moveCursorToContentStart: false });
            });

            // Prevent the editor from moving selection when clicking into the input.
            input.addEventListener("mousedown", (event) => {
              event.stopPropagation();
            });

            widget.append(prefixText, input, suffixText);
            return widget;
          },
          {
            // Keep the label visually inside the mark before the content.
            // Don't let selection/caret rendering treat the widget as a selection target.
            side: 1,
            ignoreSelection: true,
            // Critical: widgets are not wrapped by marks by default.
            // Applying the same mark ensures the widget and the text render
            // inside one contiguous mark DOM wrapper.
            marks: [markType.create({ condition })],
          },
        ),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}
