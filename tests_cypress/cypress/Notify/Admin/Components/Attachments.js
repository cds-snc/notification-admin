const Root = (selector) => cy.get(`#storybook-${selector}`);

let Components = {
    Root,
    OpenModalButton: (selector) => Root(selector).find('[data-testid="attachments-open-modal"]'),
    Modal: () => cy.getByTestId('attachments-modal'),
    FileInput: () => cy.getByTestId('attachments-file-input').last(),
    SubmitButton: () => cy.getByTestId('attachments-submit'),
    CancelButton: () => cy.getByTestId('attachments-cancel'),
    List: (selector, options = {}) => Root(selector).find('[data-testid="attachments-list"]', options),
    Summary: (selector, options = {}) => Root(selector).find('[data-testid="attachments-summary"]', options),
    MalwareMessage: (selector, options = {}) => Root(selector).find('[data-testid="attachment-malware-message"]', options),
    RemoveButtonForFile: (selector, filename) => Components.List(selector)
        .contains(filename)
        .parents('[data-testid="attached-file-row"]')
        .first()
        .find('[data-testid="attachments-remove"]'),
    RemoveConfirmButton: () => cy.getByTestId('attachments-remove-confirm'),
    RemoveCancelButton: () => cy.getByTestId('attachments-remove-cancel'),
};

let Actions = {
    openModal: (selector) => {
        Components.OpenModalButton(selector).click();
    },
    selectFiles: (files) => {
        Components.FileInput().selectFile(files, { force: true });
    },
    submitModal: () => {
        Components.SubmitButton().click();
    },
    cancelModal: () => {
        Components.CancelButton().click();
    },
    removeByFilename: (selector, filename) => {
        Components.RemoveButtonForFile(selector, filename).click();
    },
    confirmRemove: () => {
        Components.RemoveConfirmButton().click();
    },
    cancelRemove: () => {
        Components.RemoveCancelButton().click();
    },
    pressEscape: () => {
        cy.get('body').type('{esc}');
    },
};

let Attachments = {
    URL: '/_storybook?component=attachments',
    Components,
    ...Actions,
};

export default Attachments;
