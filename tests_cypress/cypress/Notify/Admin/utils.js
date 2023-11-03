let Utils = {
    checkForBadSVGType: () => {
        cy.get('body').within(() => {
            cy.get('img').each((link) => {
                if (link.prop('src').endsWith('.svg')) {
                    cy.request(link.prop('src')).its('headers').its('content-type').should('include', 'image/svg+xml');
                }
            });
        });
    },
    checkForDeadLinks: () => {
        cy.get('body').within(() => {
            cy.get('a').each((link) => {
                if (link.prop('href').startsWith('mailto') || link.prop('href').startsWith('/set-lang') || link.prop('href').startsWith('#')) return;
                cy.request(link.prop('href'));
            });
        });
    }
};

export default Utils;
