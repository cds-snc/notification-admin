/// <reference types="cypress" />

import config from "../../../../config";
import { Admin } from "../../../Notify/NotifyAPI";
import { ReviewPoolPage, PreviewBrandingPage, BrandingSettings } from "../../../Notify/Admin/Pages/AllPages";


describe("Review Pool", () => {

    before(() => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
    });

    beforeEach(() => {
        cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/review-pool`);
    });

    after(() => {
        // Restore the test service's org to the default
        Admin.LinkOrganisationToService({ orgId: config.Organisations.DEFAULT_ORG_ID, serviceId: config.Services.Cypress });
    });

    // / Navigation functionality ///
    it("Loads review pool page", () => {
        cy.contains('h1', 'Select another logo').should('be.visible');
    });

    it('Loads request branding page when [request a new logo] link is clicked', () => {
        ReviewPoolPage.ClickRequestNewLogoLink();
        cy.get('h1').contains('Request a new logo').should('be.visible');
    });

    it('Returns to edit branding page when back link is clicked', () => {
        ReviewPoolPage.ClickBackLink();
        cy.get('h1').contains('Request a new logo').should('be.visible');
    });

    context("Service's org has no custom branding", () => {

        before(() => {
            // Set the service's org to one that has no branding
            // Delete the cache key so the change is reflected
            Admin.LinkOrganisationToService({ orgId: config.Organisations.NO_CUSTOM_BRANDING_ORG_ID, serviceId: config.Services.Cypress });
            cy.task("deleteKey", `service-${config.Services.Cypress}`)
            cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/review-pool`);
        });

        it('Displays a banner indicating there is no custom branding associated with their organisation and a link to request custom branding', () => {
            ReviewPoolPage.Components.EmptyListContainer().should('be.visible');
            cy.contains('a', 'Request a new logo').should('be.visible');
        });
    });

    context("Service's org has custom branding", () => {

        before(() => {
            Admin.LinkOrganisationToService({ orgId: config.Organisations.DEFAULT_ORG_ID, serviceId: config.Services.Cypress }).then(() => {
                cy.task("deleteKey", `service-${config.Services.Cypress}`)
            })
        });

        beforeEach(() => {
            cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/review-pool`);
        });

        it('Displays a list of available logos', () => {
            // In a full E2E test, we would check for exactly the number of logos
            // associated with the service's org
            ReviewPoolPage.Components.AvailableLogoRadios().should('exist');
        });

        it('Saves the selected custom logo', () => {
            ReviewPoolPage.SelectLogoRadio();
            ReviewPoolPage.ClickPreviewButton();
            cy.contains('h1', 'Logo preview').should('be.visible');
            PreviewBrandingPage.ClickSaveBranding();
            BrandingSettings.Components.StatusBanner().should('be.visible');
        });
    });
});