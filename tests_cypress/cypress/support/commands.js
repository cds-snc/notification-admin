import "cypress-real-events";

import config from "../../config";

import LoginPage from "../Notify/Admin/Pages/LoginPage";

// keep track of what we test so we dont test the same thing twice
let links_checked = [];
let svgs_checked = [];

Cypress.Commands.add('a11yScan', (url, options = { a11y: true, htmlValidate: true, deadLinks: true, mimeTypes: true, axeConfig: false }) => {
    const current_hostname = config.Hostnames.Admin;
    // bypass rate limiting
    cy.intercept(`${current_hostname}/*`, (req) => {
        req.headers['waf-secret'] = Cypress.env(config.CONFIG_NAME).WAF_SECRET
    });

    if (url) {
        cy.visit(url);
    }

    // 1. validate a11y rules using axe dequeue
    if (options.a11y) {
        cy.injectAxe();

        if (options.axeConfig) {
            cy.configureAxe({ rules: options.axeConfig });
        }
    }

    // 2. validate html
    if (options.htmlValidate) {
        cy.get('main').htmlvalidate();
    }

    // 3. check for dead links
    if (options.deadLinks) {
        cy.get('body').within(() => {
            let checked = 0;

            cy.get('a').each((link) => {
                if (link.prop('href').startsWith('mailto') || link.prop('href').includes('/set-lang') || link.prop('href').includes(url)) return;

                const check_url = link.prop('href');

                // skip if its already been checked
                if (links_checked.includes(check_url)) return;

                // bypass rate limiting
                if (check_url.includes(current_hostname)) {
                    cy.request({
                        url: check_url,
                        headers: { 'waf-secret': Cypress.env(config.CONFIG_NAME).WAF_SECRET }
                    }).as('link');
                }
                else {
                    cy.request(link.prop('href')).as('link');
                }

                links_checked.push(check_url);
                checked++;
            }).as('links');

            cy.get('@links').then((links) => {
                cy.log('links checked', checked);
            });

        });
    }

    // 4. check for correct mime type on svg images (should be image/svg+xml)
    if (options.mimeTypes) {
        const svg_mime_type = 'image/svg+xml';
        cy.get('body').within(() => {
            let checked = 0;
            cy.get('img').each((link) => {
                const svg = link.prop('src');
                if (svg.endsWith('.svg')) {
                    // skip if its already been checked
                    if (svgs_checked.includes(svg)) return;

                    cy.request(link.prop('src')).its('headers').its('content-type').should('include', svg_mime_type);

                    svgs_checked.push(svg);
                    checked++;
                }
            }).as('svgs');

            cy.get('@svgs').then((links) => {
                cy.log('svgs checked', checked);
            });
        });
    }
});

Cypress.Commands.add('getByTestId', (selector, ...args) => {
    return cy.get(`[data-testid=${selector}]`, ...args)
});

Cypress.Commands.add('login', (username, password, agreeToTerms = true) => {
    cy.session([username, password, agreeToTerms], () => {
        LoginPage.Login(username, password, agreeToTerms);
    });
});
