/// <reference types="cypress" />

import config from "../../../../config";

describe(`Sitemap`, () => {
    it('Has link text that corresponds to page titles', () => {
      cy.visit('/sitemap');
      cy.get('main').within(() => {
        cy.get('a').each((link) => {
            const link_url = link.prop('href');
            const link_text = link.text().trim();
            
            cy.log(`Checking sitemap link: ${link_text}/${link_url}`);
            if (link_url.includes(config.Hostnames.Admin) && !link_url.includes('/#')) {
                cy.visit(link_url);
                cy.get('h1').should('contain', `${link_text}`);
            }
        });
      });
    });
});
