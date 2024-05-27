// Parts of the page a user can interact with
let Components = {
    Prompt: () => cy.getByTestId('tou-prompt'),
    ErrorMessage: () => cy.getByTestId('tou-error-message'),
    DismissButton: () => cy.getByTestId('tou-agree-button'),
    Heading: () => cy.getByTestId('tou-heading'),
    Terms: () => cy.getByTestId('tou-terms'),
};

// Actions users can take on the page
let Actions = {
    AgreeToTerms: () => {
        TouPrompt.Components.Terms().scrollTo('bottom', { ensureScrollable: false });
        Components.DismissButton().click();
        cy.url().should('include', '/accounts');
    },
};

let TouPrompt = {
    Components,
    ...Actions
};

export default TouPrompt;
