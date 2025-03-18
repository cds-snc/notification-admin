let Components = {
    BrandingSearchBox: () => cy.getByTestId('branding-search'),
    CreateBrandingButton: () => cy.getByTestId('create-branding'),
}

let Actions = {
    SearchForBranding: (name) => {
        Components.BrandingSearchBox().type(name);
    },
    CreateBranding: () => {
        Components.CreateBrandingButton().click();
    },
    EditBrandingByName: (name) => {
        cy.get('a').contains(name).click();
    },
    EditBrandingById: (id) => {
        cy.getByTestId(`edit-branding-${id}`)
    }
}

let EmailBrandingPage = {
    Components,
    ...Actions
};

export default EmailBrandingPage;