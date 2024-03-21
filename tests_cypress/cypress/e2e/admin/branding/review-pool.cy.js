/// <reference types="cypress" />

import config from "../../../../config";
import { ReviewPoolPage } from "../../../Notify/Admin/Pages/AllPages";
import { Admin } from "../../../Notify/NotifyAPI";

describe("Review Pool", () => {

    before(() => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
    });

    beforeEach(() => {
        cy.intercept('GET', '**/dashboard.json', {});
        cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/review-pool`);
    });

    // after(() => {
    //     // Restore the test service's org to the default
    //     Admin.LinkOrganisationToService({ orgId: config.Organisations.DEFAULT_ORG_ID, serviceId: config.Services.Cypress });
    // });

    /// Navigation functionality ///
    it("Loads review pool page", () => {
        cy.contains('h1', 'Select alternate logo').should('be.visible');
    });

    // BROKEN CURRENTLY
    // it('Returns to edit branding page when back link is clicked', () => {
    //     ReviewPoolPage.ClickBackLink();
    //     cy.get('h1').contains('Change your branding').should('be.visible');
    // });


    it('Loads request branding page when [request a new logo] link is clicked', () => {
        ReviewPoolPage.ClickRequestNewLogoLink();
        cy.get('h1').contains('Request a new logo').should('be.visible');
    });

    context("Service's org has no custom branding", () => {
        before(() => {
            // Change the org to one that has no branding
            Admin.LinkOrganisationToService({ orgId: config.Organisations.NO_CUSTOM_BRANDING_ORG_ID, serviceId: config.Services.Cypress });
        });

        it('Displays a banner indicating there is no custom branding associated with their organisation and a link to request custom branding', () => {
            // Change the org to one that has branding
            cy.contains('There are no logos available for this organisation yet');
            cy.contains('a', 'Begin branding request').should('be.visible');
        });
    });


    context("Service's org has custom branding", () => {
        /// Main functionality ///
        before(() => {
            // Make sure the org is set to the default one that has custom branding
            Admin.LinkOrganisationToService({ orgId: config.Organisations.DEFAULT_ORG_ID, serviceId: config.Services.Cypress });
        });

        it('Displays a list of available logos', () => {
            // Associate custom branding with the service's org
            ReviewPoolPage.Components.AvailableLogoRadios().should('not.be.empty');
        });
    });



});