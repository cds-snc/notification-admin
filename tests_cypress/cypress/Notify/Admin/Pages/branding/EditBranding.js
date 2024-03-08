// Parts of the page a user can interact with
let Components = {
    BrandGocEn: () => cy.get('input[value="\\_\\_FIP-EN\\_\\_"]'),
    BrandGocFr: () => cy.get('input[value="\\_\\_FIP-FR\\_\\_"]'),
    BrandFieldset: () => cy.getByTestId('goc_branding'),
    BrandPoolLink: () => cy.getByTestId('goto-pool'),
    BrandPreview: () => cy.getByTestId('brand_preview'),
    ChangeBranding: () => cy.getByTestId('change_branding'),
    SubmitButton: () => cy.get('button[type="submit"]'),
};

let Actions = {
    SelectBrandGoc: (lang) => {
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