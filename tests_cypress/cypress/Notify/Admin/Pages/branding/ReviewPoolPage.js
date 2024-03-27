let Components = {
    AvailableLogoRadios: () => cy.get('input[id*="pool_branding-"]'),
    RequestNewLogoLink: () => cy.getByTestId('goto-request'),
    PreviewButton: () => cy.getByTestId('preview'),
    // Common components
    BackLink: () => cy.getByTestId('go-back')
};

let Actions = {
    SelectLogoRadio: () => {
        Components.AvailableLogoRadios().click();
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