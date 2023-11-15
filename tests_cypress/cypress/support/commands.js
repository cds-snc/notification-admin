// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add('a11yScan', (url, options={ a11y: true, htmlValidate: true, deadLinks: true, mimeTypes: true }) => {
    cy.visit(url)

    // 1. validate a11y rules using axe dequeue
    if (options.a11y) {
        cy.injectAxe();
        cy.checkA11y();
    }

    // 2. validate html
    if (options.htmlValidate) {
        cy.get('main').htmlvalidate({
            rules: {
                "no-redundant-role": "off",
                "no-dup-class": "off",
                "require-sri": "off",
            },
        });
    }

    // 3. check for dead links
    if (options.deadLinks) {
        cy.get('body').within(() => {
            cy.get('a').each((link) => {
                if (link.prop('href').startsWith('mailto') || link.prop('href').startsWith('/set-lang') || link.prop('href').startsWith('#')) return;
                cy.request(link.prop('href'));
            });
        });
    }

    // 4. check for correct mime type on svg images (should be image/svg+xml)
    if (options.mimeTypes) {
        const svg_mime_type = 'image/svg+xml';
        cy.get('body').within(() => {
            cy.get('img').each((link) => {
                if (link.prop('src').endsWith('.svg')) {
                    cy.request(link.prop('src')).its('headers').its('content-type').should('include', svg_mime_type);
                }
            });
        });
    }
 })
