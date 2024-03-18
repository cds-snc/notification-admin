let Components = {
    AvailableLogoRadios: () => cy.get('div[class="multiple-choice"]').within(() => {
        return cy.get('input').debug().should('have.attr', 'name', 'pool_branding');
    }),
    RequestNewLogoLink: () => cy.getByTestId('goto-request'),
    PreviewButton: () => cy.getByTestId('preview'),
    // Common components
    BackLink: () => cy.getByTestId('go-back')
};

let Actions = {
    SelectLogoRadio: (testId) => {
        cy.getByTestId(testId).click();
    },
    ClickBackLink: () => {
        Components.BackLink().click();
    },
    ClickPreviewButton: () => {
        Components.PreviewButton().click();
    },
    ClickRequestNewLogoLink: () => {
        Components.RequestNewLogoLink().click();
    },
};

let ReviewPoolPage = {
    Components,
    ...Actions
};

export default ReviewPoolPage;