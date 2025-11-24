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
      "Mod-Alt-3": () => {
        if (this.editor.can().chain().focus().toggleVariable)
          this.editor.chain().focus().toggleVariable().run();
        else this.editor.chain().focus().setMark("variable").run?.();
        return true;
      },
      "Mod-Alt-4": () => {
        this.editor.chain().focus().toggleBulletList().run();
        return true;
      },
      "Mod-Alt-5": () => {
        this.editor.chain().focus().toggleOrderedList().run();
        return true;
      },
      "Mod-Alt-6": () => {
        this.editor.chain().focus().setHorizontalRule().run();
        return true;
      },
      "Mod-Alt-7": () => {
        this.editor.chain().focus().toggleBlockquote().run();
        return true;
      },
      "Mod-Alt-8": () => {
        if (this.editor.can().chain().focus().toggleEnglishBlock)
          this.editor.chain().focus().toggleEnglishBlock().run();
        return true;
      },
      "Mod-Alt-9": () => {
        if (this.editor.can().chain().focus().toggleFrenchBlock)
          this.editor.chain().focus().toggleFrenchBlock().run();
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
