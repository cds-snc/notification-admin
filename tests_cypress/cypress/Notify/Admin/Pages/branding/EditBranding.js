// Parts of the page a user can interact with
let Components = {
    BrandGocEn: () => cy.getByTestId('__FIP-EN__'),
    BrandGocFr: () => cy.getByTestId('__FIP-FR__'),
    BrandFieldset: () => cy.getByTestId('goc_branding'),
    BrandPoolLink: () => cy.getByTestId('goto-pool'),
    ChangeBranding: () => cy.getByTestId('change_branding'),
    SubmitButton: () => cy.getByTestId('submit'),
};

let Actions = {
    SelectDefaultBranding: (lang) => {
        lang === 'en' ? Components.BrandGocEn().check() : Components.BrandGocFr().check();
    },
    ClickBrandPool: () => {
        Components.BrandPoolLink().click();
    },
    Submit: () => {
        Components.SubmitButton().click();
    },
};

let EditBrandingPage = {
    Components,
    ...Actions
};

export default EditBrandingPage;