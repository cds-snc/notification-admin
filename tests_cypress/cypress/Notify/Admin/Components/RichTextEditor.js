export const FORMATTING_OPTIONS = {
    HEADING_1: { testId: 'rte-heading_1', labelEn: 'Heading', labelFr: 'Titre' },
    HEADING_2: { testId: 'rte-heading_2', labelEn: 'Subheading', labelFr: 'Sous-titre' },
    VARIABLE: { testId: 'rte-variable', labelEn: 'Variable', labelFr: 'Variable' },
    BOLD: { testId: 'rte-bold', labelEn: 'Bold', labelFr: 'Gras' },
    ITALIC: { testId: 'rte-italic', labelEn: 'Italic', labelFr: 'Italique' },
    BULLET_LIST: { testId: 'rte-bullet_list', labelEn: 'Bulleted List', labelFr: 'Liste à puces' },
    NUMBERED_LIST: { testId: 'rte-numbered_list', labelEn: 'Numbered List', labelFr: 'Liste numérotée' },
    // LINK: 'rte-link',
    // HORIZONTAL_RULE: 'rte-horizontal_rule',
    BLOCKQUOTE: { testId: 'rte-blockquote', labelEn: 'Blockquote', labelFr: 'Bloc en retrait' },
    ENGLISH_BLOCK: { testId: 'rte-english_block', labelEn: 'English content', labelFr: 'Contenu en anglais' },
    FRENCH_BLOCK: { testId: 'rte-french_block', labelEn: 'French content', labelFr: 'Contenu en français' },
    RTL: { testId: 'rte-rtl_block', labelEn: 'Right-to-left text', labelFr: 'Afficher de droite à gauche' },
    CONDITIONAL_INLINE: { testId: 'rte-conditional_inline', labelEn: 'Conditional text', labelFr: 'Texte conditionnel' },
    CONDITIONAL_BLOCK: { testId: 'rte-conditional_block', labelEn: 'Conditional section', labelFr: 'Section conditionnelle' },
};

// Parts of the component a user can interact with
let Components = {
    Toolbar: () => cy.getByTestId('rte-toolbar'),
    Editor: () => cy.getByTestId('rte-editor').find('[contenteditable]').first(),
    MarkdownEditor: () => cy.getByTestId('template-content'),
    LiveRegion: () => cy.getByTestId('rte-liveregion'),
    // toolbar buttons
    ToolbarButtons: () => {
        // loop thtought FORMATTING_OPTIONS and get a list of cypress elements for each and return them
        const buttons = [];
        Object.entries(FORMATTING_OPTIONS).forEach(([key, value]) => {
            buttons.push({
                id: key,
                button: cy.getByTestId(value.testId)
            });
        });
        return buttons;
    },
    H1Button: () => cy.getByTestId(FORMATTING_OPTIONS.HEADING_1.testId),
    H2Button: () => cy.getByTestId(FORMATTING_OPTIONS.HEADING_2.testId),
    VariableButton: () => cy.getByTestId(FORMATTING_OPTIONS.VARIABLE.testId),
    BoldButton: () => cy.getByTestId(FORMATTING_OPTIONS.BOLD.testId),
    ItalicButton: () => cy.getByTestId(FORMATTING_OPTIONS.ITALIC.testId),
    BulletListButton: () => cy.getByTestId(FORMATTING_OPTIONS.BULLET_LIST.testId),
    NumberedListButton: () => cy.getByTestId(FORMATTING_OPTIONS.NUMBERED_LIST.testId),
    LinkButton: () => cy.getByTestId('rte-link'),
    HorizontalRuleButton: () => cy.getByTestId('rte-horizontal_rule'),
    BlockquoteButton: () => cy.getByTestId(FORMATTING_OPTIONS.BLOCKQUOTE.testId),
    EnglishBlockButton: () => cy.getByTestId(FORMATTING_OPTIONS.ENGLISH_BLOCK.testId),
    FrenchBlockButton: () => cy.getByTestId(FORMATTING_OPTIONS.FRENCH_BLOCK.testId),
    RTLButton: () => cy.getByTestId(FORMATTING_OPTIONS.RTL.testId),
    ConditionalInlineButton: () => cy.getByTestId(FORMATTING_OPTIONS.CONDITIONAL_INLINE.testId),
    ConditionalBlockButton: () => cy.getByTestId(FORMATTING_OPTIONS.CONDITIONAL_BLOCK.testId),
    ViewMarkdownButton: () => cy.getByTestId('rte-toggle-markdown'),
    EditorAnnouncer: () => cy.getByTestId('tiptap-editor-label-cursor-announcer'),
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
        cy.getByTestId(FORMATTING_OPTIONS[option].testId).click();
    }
};

let RichTextEditor = {
    URL: '/_storybook?component=text-editor-tiptap',
    Components,
    ...Actions
};

export default RichTextEditor;
