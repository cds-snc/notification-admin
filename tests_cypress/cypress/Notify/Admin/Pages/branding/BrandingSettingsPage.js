let Components = {
    ChangeLogo: () => cy.getByTestId("change-logo"),
    // Email jinja template uses a shadowroot so we have to treat this one differently
    TemplatePreview: () => cy.getByTestId("template-preview").shadow().find('img'),
    StatusBanner: () => cy.get('div[role="status"]'),
    BackButton: () => cy.getByTestId("go-back")
}

let Actions = {
    ChooseDifferentLogo: () => {
        Components.ChangeLogo().click();
    },
    GoBack: () => {
        Components.BackButton().click();
    }
}

let BrandingSettingsPage = {
    Components,
    ...Actions
};

export default BrandingSettingsPage;