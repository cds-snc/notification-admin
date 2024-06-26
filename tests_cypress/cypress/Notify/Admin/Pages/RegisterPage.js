// Parts of the page a user can interact with
let Components = {
    Continue: () => cy.get('button[type="submit"]'),
    TOUTrigger: () => cy.getByTestId('tou-dialog-trigger'),
    TOUDialog: () => cy.getByTestId('tou-dialog'),
    TOUClose: () => cy.getByTestId('tou-close-button'),
    TOUCancel: () => cy.getByTestId('tou-cancel-button'),
    TOUAgree: () => cy.getByTestId('tou-agree-button'),
    TOUTerms: () => cy.getByTestId('tou-terms'),
    TOUStatusComplete: () => cy.getByTestId('tou-complete'),
    TOUStatusNotComplete: () => cy.getByTestId('tou-not-complete'),
    TOUErrorMessage: () => cy.getByTestId('tou-error-message'),
    TOUValidationSummaryErrorMessage: () => cy.getByTestId('tou-val-summ-err'),
    TOUInstruction: () => cy.getByTestId('tou-instruction')
};

// Actions users can take on the page
let Actions = {
    AgreeToTerms: () => {
        Components.TOUTerms().scrollTo('bottom', { ensureScrollable: false });
        Components.TOUAgree().click();
        Components.TOUDialog().should('not.be.visible');
    },
    Cancel: () => {
        Components.TOUCancel().click();
        Components.TOUDialog().should('not.be.visible');
    },
    Close: () => {
        Components.TOUClose().click();
        Components.TOUDialog().should('not.be.visible');
    },
    ScrollTerms: () => {
        Components.TOUTerms().scrollTo('bottom', { ensureScrollable: false });
    },
    Continue: () => {
        Components.Continue().click();
    }
};

let RegisterPage = {
    Components,
    ...Actions
};

export default RegisterPage;
