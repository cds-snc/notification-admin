/// <reference types="cypress" />

import config from "../../../../config";
import { EditBranding, LoginPage } from "../../../Notify/Admin/Pages/all";

describe('Branding request', () => {
    // Login to notify before the test suite starts
    before(() => {
        LoginPage.Login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        // ensure we logged in correctly
        cy.contains('h1', 'Sign-in history').should('be.visible');
    });

    beforeEach(() => {
        // stop the recurring dashboard fetch requests
        cy.intercept('GET', '**/dashboard.json', {});
        cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/edit-branding`);
    });

    it('Should save English-first logo when selected', () => {
        EditBranding.SelectBrandGoc("en");
        EditBranding.Submit();
        cy.get('span').contains('English Government of Canada signature');
    });

    it('Should save French-first logo when selected', () => {
        EditBranding.SelectBrandGoc("fr");
        EditBranding.Submit();
        cy.get('span').contains('French Government of Canada signature');
    });

    it('Loads edit branding page', () => {
        cy.contains('h1', 'Change your branding').should('be.visible');
    });

    it('Shows images of the default EN and FR branding', () => {
        EditBranding.Components.BrandFieldset().within(() => {
            cy.get('img').first().should('have.attr', 'src').then(src => {
                expect(src).to.include('gc-logo-en.png');
            });
            cy.get('img').last().should('have.attr', 'src').then(src => {
                expect(src).to.include('gc-logo-fr.png');
            });
        })
    });

    it('Cannot submit when no selection was made', () => {
        EditBranding.Submit();
        cy.contains('span', 'This field is required.').should('be.visible');
    });

    it('Navigates to branding pool when select another logo from test link is clicked', () => {
        EditBranding.ClickBrandPool();
        cy.contains('h1', 'Choose branding from pool').should("be.visible");
    })
});