import { Decoration, DecorationSet } from "@tiptap/pm/view";

const normalizeCondition = (value) => {
  const trimmed = (value || "").trim();
  return trimmed || "condition";
};

const findMarkRangeInParent = (state, markType, condition, aroundPos) => {
  const $around = state.doc.resolve(aroundPos);
  const parentStart = $around.start();
  const parentEnd = $around.end();

  const ranges = [];
  let current = null;

  state.doc.nodesBetween(parentStart, parentEnd, (node, pos) => {
    if (!node.isText) return;

    const hasThisMark = node.marks.some(
      (m) => m.type === markType && m.attrs?.condition === condition,
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
export function findConditionalMarks(doc, markType, { prefix, suffix } = {}) {
  const decorations = [];
  const createdAt = new Set();

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const marks = node.marks.filter((m) => m.type === markType);
    if (marks.length === 0) return;

    // For each conditional mark, add a widget at the beginning of that mark range.
    for (const mark of marks) {
      let condition = normalizeCondition(mark.attrs?.condition);

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
            const hasThisMark = n.marks.some(
              (m) => m.type === markType && m.attrs?.condition === condition,
            );

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
              document.createTextNode(`${prefix || "IF"} `),
            );

            const input = document.createElement("input");
            input.className = "conditional-inline-condition-input";
            input.type = "text";
            input.value = condition;
            input.setAttribute("aria-label", "Condition");
            input.setAttribute("autocomplete", "off");
            input.setAttribute("spellcheck", "false");

            const suffixText = document.createElement("span");
            suffixText.className = "conditional-inline-edit-suffix";
            suffixText.textContent = ` ${suffix || "is YES"}`;

            const commit = ({ moveCursorToEnd = false } = {}) => {
              const nextCondition = normalizeCondition(input.value);

              const pos = typeof getPos === "function" ? getPos() : null;
              if (typeof pos !== "number") return;

              const markRange = findMarkRangeInParent(
                view.state,
                markType,
                condition,
                pos,
              );
              if (!markRange) return;

              const { tr } = view.state;
              tr.removeMark(markRange.from, markRange.to, markType);
              tr.addMark(
                markRange.from,
                markRange.to,
                markType.create({ condition: nextCondition }),
              );

              // Keep selection as-is (blur) or move it to end (Enter)
              if (moveCursorToEnd) {
                tr.setSelection(
                  view.state.selection.constructor.near(
                    tr.doc.resolve(markRange.to),
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

            input.addEventListener("keydown", (event) => {
              // Don't let ProseMirror handle key events from the input.
              event.stopPropagation();

              if (event.key === "Enter") {
                event.preventDefault();
                commit({ moveCursorToEnd: true });
                view.focus();
              }
            });

            input.addEventListener("blur", () => {
              commit({ moveCursorToEnd: false });
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
