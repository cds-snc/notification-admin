import { Extension } from "@tiptap/core";

export default Extension.create({
  name: "menubarShortcut",
  addKeyboardShortcuts() {
    return {
      "Alt-F10": () => {
        // Focus the toolbar when Alt+F10 is pressed (a11y shortcut)
        const toolbar = this.editor?.rteToolbar;
        if (toolbar) {
          try {
            toolbar.dispatchEvent(
              new CustomEvent("rte-request-focus", { bubbles: true }),
            );
            return true;
          } catch (err) {
            // ignore
          }
        }
        return false;
      },

      // Platform-agnostic shortcuts: Mod maps to Cmd on macOS and Ctrl on Windows
      // Use Mod-Alt-N to match Cmd+Opt+N (mac) / Ctrl+Alt+N (windows/linux)
      "Mod-Alt-1": () => {
        this.editor.chain().focus().toggleHeading({ level: 1 }).run();
        return true;
      },
      "Mod-Alt-2": () => {
        this.editor.chain().focus().toggleHeading({ level: 2 }).run();
        return true;
      },
      "Mod-Shift-U": () => {
        if (this.editor.can().chain().focus().toggleVariable)
          this.editor.chain().focus().toggleVariable().run();
        else this.editor.chain().focus().setMark("variable").run?.();
        return true;
      },
      "Mod-Enter": () => {
        this.editor.chain().focus().setHorizontalRule().run();
        return true;
      },
      "Mod-Shift-9": () => {
        this.editor.chain().focus().toggleBlockquote().run();
        return true;
      },
      "Mod-Alt-R": () => {
        if (this.editor.can().chain().focus().toggleRtlBlock)
          this.editor.chain().focus().toggleRtlBlock().run();
        return true;
      },
      "Mod-Alt-r": () => {
        if (this.editor.can().chain().focus().toggleRtlBlock)
          this.editor.chain().focus().toggleRtlBlock().run();
        return true;
      },
      // Link open with Mod-k (Cmd/Ctrl+K)
      "Mod-k": () => {
        const toolbar = this.editor?.rteToolbar;
        if (toolbar) {
          try {
            toolbar.dispatchEvent(
              new CustomEvent("rte-open-link-modal", { bubbles: true }),
            );
            return true;
          } catch (err) {
            // ignore
          }
        }
        return false;
      },
    };
  },
});
