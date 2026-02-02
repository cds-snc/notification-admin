export const FORMATTING_OPTIONS = {
    HEADING_1: 'rte-heading_1',
    HEADING_2: 'rte-heading_2',
    VARIABLE: 'rte-variable',
    BOLD: 'rte-bold',
    ITALIC: 'rte-italic',
    BULLET_LIST: 'rte-bullet_list',
    NUMBERED_LIST: 'rte-numbered_list',
    // LINK: 'rte-link',
    // HORIZONTAL_RULE: 'rte-horizontal_rule',
    BLOCKQUOTE: 'rte-blockquote',
    ENGLISH_BLOCK: 'rte-english_block',
    FRENCH_BLOCK: 'rte-french_block',
    RTL: 'rte-rtl_block',
    CONDITIONAL_INLINE: 'rte-conditional_inline',
    CONDITIONAL_BLOCK: 'rte-conditional_block',
};

// Parts of the component a user can interact with
let Components = {
    Toolbar: () => cy.getByTestId('rte-toolbar'),
    Editor: () => cy.getByTestId('rte-editor').find('[contenteditable]').first(),
    MarkdownEditor: () => cy.getByTestId('markdown-editor'),
    LiveRegion: () => cy.getByTestId('rte-liveregion'),
    // toolbar buttons
    ToolbarButtons: () => {
        // loop thtought FORMATTING_OPTIONS and get a list of cypress elements for each and return them
        const buttons = [];
        Object.entries(FORMATTING_OPTIONS).forEach(([key, value]) => {
            buttons.push({
                id: key,
                button: cy.getByTestId(value)
            });
        });
        return buttons;
    },
    H1Button: () => cy.getByTestId(FORMATTING_OPTIONS.HEADING_1),
    H2Button: () => cy.getByTestId(FORMATTING_OPTIONS.HEADING_2),
    VariableButton: () => cy.getByTestId(FORMATTING_OPTIONS.VARIABLE),
    BoldButton: () => cy.getByTestId(FORMATTING_OPTIONS.BOLD),
    ItalicButton: () => cy.getByTestId(FORMATTING_OPTIONS.ITALIC),
    BulletListButton: () => cy.getByTestId(FORMATTING_OPTIONS.BULLET_LIST),
    NumberedListButton: () => cy.getByTestId(FORMATTING_OPTIONS.NUMBERED_LIST),
    LinkButton: () => cy.getByTestId('rte-link'),
    HorizontalRuleButton: () => cy.getByTestId('rte-horizontal_rule'),
    BlockquoteButton: () => cy.getByTestId(FORMATTING_OPTIONS.BLOCKQUOTE),
    EnglishBlockButton: () => cy.getByTestId(FORMATTING_OPTIONS.ENGLISH_BLOCK),
    FrenchBlockButton: () => cy.getByTestId(FORMATTING_OPTIONS.FRENCH_BLOCK),
    RTLButton: () => cy.getByTestId(FORMATTING_OPTIONS.RTL),
    ConditionalInlineButton: () => cy.getByTestId('rte-conditional_inline'),
    ConditionalBlockButton: () => cy.getByTestId('rte-conditional_block'),
    ViewMarkdownButton: () => cy.getByTestId('rte-toggle-markdown'),
    //link modal buttons
    LinkModal: {
        Modal: () => cy.getByTestId('link-modal'),
        Buttons: [
            { SaveButton: () => cy.getByTestId('link-modal-save-button') }, 
            { GoToButton: () => cy.getByTestId('link-modal-go-to-button') },
            { RemoveButton: () => cy.getByTestId('link-modal-remove-button') },
        ],
        URLInput: () => cy.getByTestId('link-modal-input'),
    },



};

// Actions users can take on the component
let Actions = {
    applyFormatting: (option) => {
        Components.Toolbar().find(`button.${FORMATTING_OPTIONS[option]}`).click();
    }
};

let RichTextEditor = {
    URL: '/_storybook?component=text-editor-tiptap',
    Components,
    ...Actions
};

export default RichTextEditor;
