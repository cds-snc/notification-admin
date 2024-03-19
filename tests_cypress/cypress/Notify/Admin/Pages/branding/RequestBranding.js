// Parts of the page a user can interact with
let Components = {
    BrandName: () => cy.getByTestId('brand_name'),
    BrandImage: () => cy.getByTestId('brand_image'),
    BrandPreview: () => cy.getByTestId('brand_preview'),
    SubmitButton: () => cy.get('button[type="submit"]'),
    BrandErrorMessage: () => cy.getByTestId('brand-error'), 
    LogoErrorMessage: () => cy.getByTestId('logo-error'),
};

// Actions users can take on the page
let Actions = {
    EnterBrandName: (brandName) => {
        Components.BrandName().type(brandName);
    },
    UploadBrandImage: (imagePath, mimeType) => {
        cy.fixture(imagePath, null).as('imageUpload');
        Components.BrandImage().selectFile(
            {
                contents: 'cypress/fixtures/' + imagePath,
                fileName: imagePath,
                mimeType: mimeType,
                lastModified: new Date('Feb 18 1989').valueOf(),
            },
            { 
                force: true
            }
        );
    },
    UploadMalciousFile: () => {
        cy.get('input[type=file]').selectFile(
            {
                contents: Cypress.Buffer.from('WDVPIVAlQEFQWzRcUFpYNTQoUF4pN0NDKTd9JEVJQ0FSLVNUQU5EQVJELUFOVElWSVJVUy1URVNULUZJTEUhJEgrSCo='),
                fileName: 'maclicious.png',
                mimeType: 'image/png',
                lastModified: Date.now(),
            },
            { 
                force: true 
            }
        );
    },
    Submit: () => {
        Components.SubmitButton().click();
    },
};

let BrandingRequestPage = {
    Components,
    ...Actions
};

export default BrandingRequestPage;
