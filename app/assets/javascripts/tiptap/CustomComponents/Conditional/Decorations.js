import { Decoration, DecorationSet } from "@tiptap/pm/view";

// Helper function to find all conditional inline marks and create widget decorations
export function findConditionalMarks(doc, markType) {
  const decorations = [];

  doc.descendants((node, pos) => {
    if (!node.isText) return;

    const marks = node.marks.filter((m) => m.type === markType);
    if (marks.length === 0) return;

    // For each conditional mark, add a widget at the beginning
    marks.forEach((mark) => {
      // Check if this is the start of the mark range
      const $pos = doc.resolve(pos);
      const prevNode = $pos.nodeBefore;

      // Only add widget if this is the first node with this mark
      if (!prevNode || !prevNode.marks.some((m) => m === mark)) {
        // This is the start of the mark, create a simple button
        const widget = document.createElement("button");
        widget.type = "button";
        widget.className = "conditional-inline-edit-btn";
        widget.setAttribute("contenteditable", "false");
        widget.setAttribute("data-condition", mark.attrs.condition);
        widget.setAttribute("data-pos", pos);
        widget.setAttribute("aria-label", "Edit conditional");
        widget.setAttribute("tabindex", "-1");
        widget.innerHTML =
          '<i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>';

        // Add keyboard handler for navigation
        widget.addEventListener("keydown", (event) => {
          if (event.key === "ArrowRight") {
            event.preventDefault();
            event.stopPropagation();

            // Move cursor to the start of the conditional content
            // Use a custom event to communicate with the editor
            const customEvent = new CustomEvent("conditionalInlineNavigate", {
              bubbles: true,
              detail: { action: "enterFromButton", pos: pos },
            });
            widget.dispatchEvent(customEvent);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            event.stopPropagation();

            // Move focus out of the mark (to before it)
            const customEvent = new CustomEvent("conditionalInlineNavigate", {
              bubbles: true,
              detail: { action: "exitLeftFromButton", pos: pos },
            });
            widget.dispatchEvent(customEvent);
          }
        });

        decorations.push(
          Decoration.widget(pos, widget, {
            // Keep the edit button visually inside the mark.
            // Also don't let selection/caret rendering treat the widget as a selection target.
            side: 1,
            ignoreSelection: true,
          }),
        );
      }
    });
  });

  return DecorationSet.create(doc, decorations);
}
