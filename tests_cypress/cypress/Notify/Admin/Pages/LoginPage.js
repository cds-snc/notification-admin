import TouPrompt from './TouPrompt';

const { recurse } = require('cypress-recurse')
const ADMIN_COOKIE = "notify_admin_session";

// Parts of the page a user can interact with
let Components = {
    EmailAddress: () => cy.get('#email_address'),
    Password: () => cy.get('#password'),
    SubmitButton: () => cy.get('button[type="submit"]'),
    TwoFactorCode: () => cy.get('#two_factor_code'),
};

// Actions users can take on the page
let Actions = {
    EnterCode: (code) => {
        Components.TwoFactorCode().type(code);
        Components.SubmitButton().click();
    },
    Login: (email, password, agreeToTerms=true) => {
        cy.clearCookie(ADMIN_COOKIE); // clear auth cookie
        // cy.task('deleteAllEmails'); // purge email inbox to make getting the 2fa code easier

        // login with username and password
        cy.visit(LoginPage.URL);
        Components.EmailAddress().type(email);
        Components.Password().type(password);
        Components.SubmitButton().click();

        // get email 2fa code
        recurse(
            () => cy.task('getLastEmail', email), // Cypress commands to retry
            Cypress._.isObject, // keep retrying until the task returns an object
            {
                log: true,
                limit: 250, // max number of iterations
                timeout: 120000, // time limit in ms
                delay: 500, // delay before next iteration, ms
            },
        )
            .its('html')
            .then((html) => {
                cy.document({ log: false }).invoke({ log: false }, 'write', html)
            });

        // ensure code is received and enter it
        cy.get('blockquote').should('be.visible');
        cy.get('blockquote p').invoke('text').as('MFACode');
        cy.get('@MFACode').then((text) => {
            let code = text;
            cy.visit('/two-factor-email-sent');
            Actions.EnterCode(code);
        });
    
        // ensure we logged in correctly
        TouPrompt.Components.Heading().should('be.visible');
        if (agreeToTerms) {
            TouPrompt.AgreeToTerms();
        }
    }
};

let LoginPage = {
    URL: '/sign-in', // URL for the page, relative to the base URL
    Components,
    ...Actions
};

export default LoginPage;
