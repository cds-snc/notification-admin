/// <reference types="cypress" />

import config from "../../../../config";

const langs = ['en', 'fr'];

const fullPageList = [
    { en: '/accessibility', fr: '/accessibilite' },
    { en: '/features', fr: '/fonctionnalites' },
    { en: '/formatting-emails', fr: '/guide-mise-en-forme' },
    { en: '/service-level-agreement', fr: '/accord-niveaux-de-service' },
    { en: '/terms', fr: '/conditions-dutilisation' },
    { en: '/guidance', fr: '/guides-reference' },
    { en: '/home', fr: '/accueil' },
    { en: '/message-delivery-status', fr: '/etat-livraison-messages' },
    { en: '/other-services', fr: '/autres-services' },
    { en: '/privacy', fr: '/confidentialite' },
    { en: '/security', fr: '/securite' },
    { en: '/sending-custom-content', fr: '/envoyer-contenu-personnalise' },
    { en: '/service-level-objectives', fr: '/objectifs-niveau-de-service' },
    { en: '/system-status', fr: '/etat-du-systeme' },
    { en: '/understanding-delivery-and-failure', fr: '/comprendre-statut-de-livraison' },
    { en: '/updating-contact-information', fr: '/maintenir-a-jour-les-coordonnees' },
    { en: '/using-a-spreadsheet', fr: '/utiliser-une-feuille-de-calcul' },
    { en: '/why-gc-notify', fr: '/pourquoi-notification-gc' },
    { en: '/new-features', fr: '/nouvelles-fonctionnalites' },
];

describe('GCA static pages', () => {
    context("Check for dead links", () => {
        for (const lang of langs) {
            const currentLang = (lang === 'en' ? 'English' : 'Francais');
            context(currentLang, () => {
                for (const page of fullPageList) {
                    it(`${page[lang]} contains no dead links`, () => {
                        if (lang === 'fr') {
                            cy.visit('/set-lang');
                        }
                        cy.visit(page[lang]);

                        cy.get('body').within(() => {
                            cy.get('a').each((link) => {
                                if (link.prop('href').startsWith('mailto') || link.prop('href').startsWith('/set-lang') || link.prop('href').startsWith('#')) return;
                                cy.request(link.prop('href'));
                            });
                        });
                    });
                }
            });
        }

    });

    for (const viewport of config.viewports) {
        context('A11y and HTML validation test', () => {
            context(`Viewport: ${viewport}px x 660px`, () => {
                for (const lang of langs) {
                    const currentLang = (lang === 'en' ? 'English' : 'Francais');
                    context(currentLang, () => {
                        for (const page of fullPageList) {
                            it(`${page[lang]} passes a11y checks`, () => {
                                // cy.viewport(viewport, 660);
                                if (lang === 'fr') {
                                    cy.visit('/set-lang');
                                }
                                cy.visit(page[lang]);

                                cy.get('main').should('be.visible');

                                // check for a11y compliance
                                cy.injectAxe();
                                cy.checkA11y();
                            });
                        }
                    });
                }
            });
        });
    }
});