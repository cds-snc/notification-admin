// Parts of the page a user can interact with
let Components = {
    AddServiceButton: () => cy.get('a[href="/add-service"]'),
    DefaultBranding: () => cy.get('#default_branding-0'),
    ServiceName: () => cy.get('#name'),
    SendingAddress: () => cy.get('#email_from'),
    DepartmentName: () => cy.get('#parent_organisation_name'),
    SubmitButton: () => cy.get('button[type="submit"]'),
};

// Actions users can take on the page
let Actions = {
    AddService: (branding, ) => {
        Components.AddServiceButton().click();
        cy.contains('h1', 'Choose order for official languages').should('be.visible');
        
        Components.DefaultBranding().check();
        Components.SubmitButton().click();
        cy.contains('h1', 'Create service name and email address').should('be.visible');

        Components.ServiceName().type('Test Service ' + (Math.random() + 1).toString(36).substring(4));
        Components.SendingAddress().type('test' + (Math.random() + 1).toString(36).substring(4));
        Components.SubmitButton().click();
        cy.contains('h1', 'About your service').should('be.visible');

        Components.DepartmentName().type('Treasury Board of Canada Secretariat');
        Components.SubmitButton().click();
        cy.contains('h1', 'Dashboard').should('be.visible');
    }   

};

let AccountsPage = {
    URL: '/accounts', // URL for the page, relative to the base URL
    Components,
    ...Actions
};

export default AccountsPage;
