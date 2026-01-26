// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-axe'
import 'cypress-html-validate/commands'
import { getHostname } from "./utils";

// Alternatively you can use CommonJS syntax:
// require('./commands')

console.log("config", Cypress.config('baseUrl'));

before(() => {
    // Bypass rate-limit in staging for any requests not using cy.visit (css, js, etc)
    cy.intercept('**/*', (req) => {
      if (req.url.includes(getHostname('Admin'))) {
        req.headers['waf-secret'] = Cypress.env(Cypress.env('ENV')).WAF_SECRET;
      }
    }).as('allRequests');
    
});
