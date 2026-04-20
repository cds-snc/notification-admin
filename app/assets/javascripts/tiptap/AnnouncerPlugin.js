import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";

/**
 * A TipTap extension that provides a ProseMirror plugin to track the active node/mark stack
 * and announce it to screen readers via an ARIA live region.
 */
export const AnnouncerPlugin = (t) => {
  let lastAnnouncement = "";

  return Extension.create({
    name: "announcer",

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey("announcer"),
          appendTransaction(transactions, oldState, newState) {
            // Only process if the selection changed
            if (!transactions.some((tr) => tr.selectionSet)) return null;

            const { selection } = newState;
            const { $from } = selection;
            const stack = [];

            // 1. Process active marks at current selection
            const marks = $from.marks();
            marks.forEach((mark) => {
              const label = t.ariaDescriptions[mark.type.name];
              if (label) stack.push(label);
            });

            // 2. Handle Node Selection (Atomic nodes like HorizontalRule)
            if (selection.node) {
              let label = t.ariaDescriptions[selection.node.type.name];
              if (selection.node.type.name === "horizontalRule") {
                // For separators, we just want the role (e.g., "Separator")
                // without the extra description (e.g., "Section break")
                label = t.ariaDescriptions.roleSeparator || "Separator";
              }
              if (label) stack.push(label);
            }

            // 3. Process node hierarchy (Wrappers)
            // Iterate from the bottom up to the document root
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              let label = t.ariaDescriptions[node.type.name];

              // Specific handling for dynamic levels
              if (node.type.name === "heading") {
                label = t.ariaDescriptions[`heading${node.attrs.level}`];
              }

              if (label && !stack.includes(label)) {
                // Add to stack if not already present (avoid duplicates)
                stack.push(label);
              }
            }

            // Join labels into a comma-separated list
            // e.g., "Bold, Bulleted list, English content"
            const announcement = stack.join(", ");

            // Only update if the announcement string has changed to avoid chatter
            if (announcement !== lastAnnouncement) {
              lastAnnouncement = announcement;
              updateAnnouncer(announcement);
            }

            return null;
          },
        }),
      ];
    },
  });
};

function updateAnnouncer(text) {
  const announcer = document.getElementById("editor-announcer");
  if (!announcer) return;

  // We toggle the text content to ensure the ARIA-live region re-triggers
  // the announcement even if the user moves between identical environments.
  announcer.textContent = "";
  if (text) {
    setTimeout(() => {
      announcer.textContent = text;
    }, 50);
  }
}
