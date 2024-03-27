let Components = {
    SaveButton: () => cy.get('button[type="submit"]').debug(),
    // Common components
    BackLink: () => cy.getByTestId('go-back')
};

let Actions = {
    ClickSaveBranding: () => {
        Components.SaveButton().click();
    },
};

let PreviewBrandingPage = {
    Components,
    ...Actions
};

export default PreviewBrandingPage;