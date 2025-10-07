import { Node } from '@tiptap/core';

// Factory function to create language-specific nodes
const createLanguageNode = (language, langCode) => {
  return Node.create({
    name: `${language.toLowerCase()}Block`,

    // Allow this node to contain other content
    content: 'block+',

    // This is a block-level node that can wrap other content
    group: 'block',

    // Allow this node to be selected as a whole
    selectable: true,

    addOptions() {
      return {
        HTMLAttributes: {},
        language: language,
        langCode: langCode,
      };
    },

    parseHTML() {
      return [
        {
          tag: `div[lang="${langCode}"]`,
        },
        {
          tag: `div[data-lang="${language.toLowerCase()}"]`,
        },
      ];
    },

    renderHTML({ HTMLAttributes }) {
      return ['div', { 
        'lang': langCode, 
        'data-lang': language.toLowerCase(),
        'data-type': `${language.toLowerCase()}-block`,
        ...HTMLAttributes 
      }, 0];
    },

    addCommands() {
      return {
        // Command to insert/add the language block (empty)
        [`set${language}Block`]:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.insertContent({
              type: this.name,
              attrs: attributes,
              content: [
                {
                  type: 'paragraph',
                },
              ],
            });
          },

        // Command to wrap selection in language block
        [`wrapIn${language}Block`]:
          (attributes = {}) =>
          ({ commands }) => {
            return commands.wrapIn(this.name, attributes);
          },

        // Command to toggle the language block (wrap if not present, unwrap if present)
        [`toggle${language}Block`]:
          (attributes = {}) =>
          ({ commands, state }) => {
            const { selection } = state;
            const { $from, $to } = selection;

            // Check if we're already inside this language block
            let languageBlock = null;
            state.doc.nodesBetween($from.pos, $to.pos, (node, pos) => {
              if (node.type.name === this.name) {
                languageBlock = { node, pos };
                return false; // Stop searching
              }
            });

            if (languageBlock) {
              // We're inside this language block, so unwrap it
              return commands.lift(this.name);
            } else {
              // Not inside this language block, so wrap selection in one
              return commands.wrapIn(this.name, attributes);
            }
          },

        // Command to remove/unwrap the language block
        [`unset${language}Block`]:
          () =>
          ({ commands }) => {
            return commands.lift(this.name);
          },
      };
    },
  });
};

// Create the specific language node extensions
export const EnglishBlock = createLanguageNode('English', 'en-CA');
export const FrenchBlock = createLanguageNode('French', 'fr-CA');

// For backward compatibility, export English as default
export default EnglishBlock;
