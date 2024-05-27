// Parts of the page a user can interact with
let Components = {
    Dialog: () => cy.getByTestId('tou-dialog'),
    ErrorMessage: () => cy.getByTestId('tou-error-message'),
    DismissButton: () => cy.getByTestId('tou-agree-button'),
    Heading: () => cy.getByTestId('tou-heading'),
    Terms: () => cy.getByTestId('tou-terms'),
};

// Actions users can take on the page
let Actions = {
    AgreeToTerms: () => {
        TouDialog.Components.Terms().scrollTo('bottom', { ensureScrollable: false });
        Components.DismissButton().click();
        cy.url().should('include', '/login-events');
    },
};

let TouDialog = {
    Components,
    ...Actions
};

export default TouDialog;
