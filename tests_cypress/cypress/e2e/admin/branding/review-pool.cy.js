/// <reference types="cypress" />

import config from "../../../../config";
import { ReviewPoolPage } from "../../../Notify/Admin/Pages/AllPages";

describe("Review Pool", () => {

    before(() => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
    });

    beforeEach(() => {
        cy.intercept('GET', '**/dashboard.json', {});
        cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/review-pool`);
    });

    /// Navigation functionality ///
    it("Loads review pool page", () => {
        cy.contains('h1', 'Select alternate logo').should('be.visible');
    });

    // it('Returns to edit branding page when back link is clicked', () => {
    //     ReviewPoolPage.ClickBackLink();
    //     cy.get('h1').contains('Change your branding').should('be.visible');
    // });

    context("Service's org has no custom branding", () => {
        before(() => {
            // Change the org to one that has no branding

        });

        after(() => {
            // Set the org back to one that has branding
        });

        it('Displays a banner indicating there is no custom branding associated with their organisation and a link to request custom branding', () => {
            // Change the org to one that has branding
            cy.contains('There are no logos available for this organisation yet');
            cy.contains('a', 'Begin branding request').should('be.visible');
        });
    });


    // context("Service's org has custom branding", () => {
    //     /// Main functionality ///
    //     it('Loads request branding page when [request a new logo] link is clicked', () => {
    //         ReviewPoolPage.ClickRequestNewLogoLink();
    //         cy.get('h1').contains('Request a new logo').should('be.visible');
    //     });
    // });


    // it('Displays a list of available logos', () => {
    //     // Associate custom branding with the service's org
    //     ReviewPoolPage.Components.AvailableLogoRadios().should('not.be.empty');
    // });
});