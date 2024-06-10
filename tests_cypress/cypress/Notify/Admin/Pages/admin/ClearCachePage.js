// Parts of the page a user can interact with
let Components = {
    UserCache: () => cy.getByTestId('user'),
    ServiceCache: () => cy.getByTestId('service'),
    TemplateCache: () => cy.getByTestId('template'),
    EmailBrandingCache: () => cy.getByTestId('email_branding'),
    LetterBrandingCache: () => cy.getByTestId('letter_branding'),
    OrganisationCache: () => cy.getByTestId('organisation'),
    GcArticlesCache: () => cy.getByTestId('gc-articles'),
    ClearCacheButton: () => cy.get('[data-button-id="btn"]')
};

let Actions = {
    // TODO: Could probably just select the fieldset and iterate over the input
    //       elements until we find the requested cache to clear. Flip side is
    //       is you have to know what the test-id's are before hand.
    SelectCacheToClear: (cache) => {
        switch (cache) {
            case 'user':
                Components.UserCache().check();
                break;
            case 'service':
                Components.ServiceCache().check();
                break;
            case 'template':
                Components.TemplateCache().check();
                break;
            case 'email_branding':
                Components.EmailBrandingCache().check();
                break;
            case 'letter_branding':
                Components.LetterBrandingCache().check();
                break;
            case 'organisation':
                Components.OrganisationCache().check();
                break;
            case 'gc-articles':
                Components.GcArticlesCache().check();
                break;
            default:
                throw new Error('Invalid cache type');
        }
    },
    ClickClearCacheButton: () => {
        Components.ClearCacheButton().click();
    }
};

let ClearCachePage = {
    Components,
    ...Actions
};

export default ClearCachePage;