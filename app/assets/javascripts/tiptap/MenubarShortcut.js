import { Extension } from '@tiptap/core';

export default Extension.create({
  name: 'menubarShortcut',
  addKeyboardShortcuts() {
    return {
      'Alt-F10': () => {
        // If the toolbar was registered on the editor instance, use it directly.
        const toolbar = this.editor?.rteToolbar;
        if (toolbar) {
          try {
            toolbar.dispatchEvent(new CustomEvent('rte-request-focus', { bubbles: true }));
            return true;
          } catch (err) {
            // ignore
          }
        }
      },
    };
  },
});
