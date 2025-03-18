let Components = {
    UploadLogoButton: () => cy.getByTestId('upload-logo'),
    BrandName: () => cy.getByTestId('branding-name'),
    BrandText: () => cy.getByTestId('branding-text'),
    BrandAltTextEn: () => cy.getByTestId('branding-alt-text-en'),
    BrandAltTextFr: () => cy.getByTestId('branding-alt-text-fr'),
    BrandColour: () => cy.getByTestId('branding-colour'),
    CreateBrandingButton: () => cy.getByTestId('save-branding'),
}

let BrandingTypes = {
    BOTH_ENGLISH: "both_english",
    BOTH_FRENCH: "both_french",
    CUSTOM_LOGO: "custom_logo",
    CUSTOM_LOGO_WITH_BG_COLOUR: "custom_logo_with_background_colour",
    NO_BRANDING: "no_branding",
}


let Actions = {
    UploadLogo: () => {
        // TODO
    },
    SetBrandName: (name) => {
        Components.BrandName().clear().type(name);
    },
    SetBrandText: (text) => {
        Components.BrandText().clear().type(text);
    },
    SetBrandAltTextEn: (text) => {
        Components.BrandAltTextEn().clear().type(text);
    },
    SetBrandAltTextFr: (text) => {
        Components.BrandAltTextFr().clear().type(text);
    },
    SetBrandColour: (colour) => {
        Components.BrandColour().clear().type(colour);
    },
    SetBrandType: (type) => {
        cy.getByTestId(type).check();
    },
    SetOrganisation: (organisation) => {
        // Use no org for the time being until we have a way to fetch a list of
        // valid organisation IDs as the testid's for these radios are org ids
        // which will change between environments.
        cy.get('input[id="organisation-5"]').check();
    },
    Submit: () => {
        Components.CreateBrandingButton().click();
    }
}

let ManageEmailBrandingPage = {
    Components,
    BrandingTypes,
    ...Actions
}

export default ManageEmailBrandingPage;