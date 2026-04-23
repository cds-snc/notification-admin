import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Extension } from "@tiptap/core";

/**
 * A TipTap extension that provides a ProseMirror plugin to track the active node/mark stack
 * and announce it to screen readers via an ARIA live region.
 */
export const AnnouncerPlugin = (t, announcerRef) => {
  let lastAnnouncement = "";

  const updateAnnouncer = (text) => {
    const announcer = announcerRef.current;
    if (!announcer) return;

    // We toggle the text content to ensure the ARIA-live region re-triggers
    // the announcement even if the user moves between identical environments.
    announcer.textContent = "";
    if (text) {
      setTimeout(() => {
        announcer.textContent = text;
      }, 50);
    }
  };

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
              const label = t[mark.type.name]?.label;
              if (label) stack.push(label);
            });

            // 2. Handle Node Selection (Atomic nodes like HorizontalRule)
            if (selection.node) {
              const label = t[selection.node.type.name]?.label;
              if (label) stack.push(label);
            }

            // 3. Process node hierarchy (Wrappers)
            for (let d = $from.depth; d > 0; d--) {
              const node = $from.node(d);
              const nodeName = node.type.name;
              let label;

              if (nodeName === "heading") {
                label = t[`heading${node.attrs.level}`]?.label;
              } else {
                label = t[nodeName]?.label;
              }

              // Special handling for RTL
              if (node.attrs && node.attrs.dir === "rtl") {
                const rtlLabel = t.rtlBlock?.label;
                if (rtlLabel) stack.push(rtlLabel);
              }

              if (label && !stack.includes(label)) {
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
