import RegisterPage from "./RegisterPage";
const { recurse } = require('cypress-recurse')


let Components = {
    FullName: () => cy.get("#name"),
    EmailAddress: () => cy.get('#email_address'),
    MobileNumber: () => cy.get('#mobile_number'),
    Password: () => cy.get('#password'),
    TwoFactorCode: () => cy.get('#two_factor_code'),
    SubmitButton: () => cy.get('button[type="submit"]'),
}


let Actions = {
    VisitPage: () => {
        cy.visit(CreateAccountPage.URL)
    },

    EmptySubmit: () => {
        Components.SubmitButton().click();
    },

    Submit: (name, email, mobile, password) => {
        Components.FullName().type(name);
        Components.EmailAddress().type(email);
        Components.MobileNumber().type(mobile);
        Components.Password().type(password);
        Components.SubmitButton().click();
    },

    WaitForConfirmationEmail: () => {
        recurse(
            () => cy.task('getLastEmail', {}), // Cypress commands to retry
            Cypress._.isObject,
            {
                log: true,
                limit: 250, // max number of iterations
                timeout: 120000, // time limit in ms
                delay: 500, // delay before next iteration, ms
            },
        )
            .its('html')
            .then((html) => (
                cy.document({ log: false }).invoke({ log: false }, 'write', html)
            ));
    },

    CreateAccount: (name, email, mobile, password) => {
        cy.task('deleteAllEmails', {});
        Components.FullName().type(name);
        Components.EmailAddress().type(email);
        Components.MobileNumber().type(mobile);
        Components.Password().type(password);
        RegisterPage.Components.TOUTrigger().click();
        RegisterPage.AgreeToTerms();
        Components.SubmitButton().click();
    }
};

let CreateAccountPage = {
    URL: '/register',
    Components,
    ...Actions
};

export default CreateAccountPage;