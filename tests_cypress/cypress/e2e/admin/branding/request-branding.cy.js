/// <reference types="cypress" />

import config from "../../../../config";
import { RequestBranding } from "../../../Notify/Admin/Pages/AllPages";


describe('Branding request', () => {
    // Login to notify before the test suite starts
    before(() => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
    });

    beforeEach(() => {
        // stop the recurring dashboard fetch requests
        cy.intercept('GET', '**/dashboard.json', {});
        cy.visit(config.Hostnames.Admin + `/services/${config.Services.Cypress}/branding-request`);
    });


    it('Loads request branding page', () => {
        cy.contains('h1', 'Request a new logo').should('be.visible');
    });
    it('Disallows submission when there is no data', () => {
        RequestBranding.Submit();
        RequestBranding.Components.BrandErrorMessage().should('be.visible');
        RequestBranding.Components.LogoErrorMessage().should('be.visible');
    });

    it('Disallows submission when there is no image', () => {
        RequestBranding.EnterBrandName('Test Brand');
        RequestBranding.Submit();
        RequestBranding.Components.LogoErrorMessage().should('be.visible');
    });

    it('Disallows submission when there is no brand name', () => {
        RequestBranding.UploadBrandImage('cds2.png', 'image/png');
        RequestBranding.Submit();
        RequestBranding.Components.BrandErrorMessage().should('be.visible');
    });

    it('Only allows pngs', () => {
        RequestBranding.EnterBrandName('Test Brand');

        RequestBranding.UploadBrandImage('cds2.jpg', 'image/jpg');
        RequestBranding.Submit();
        RequestBranding.Components.LogoErrorMessage().should('be.visible');

        RequestBranding.UploadBrandImage('example.json', 'text/plain');
        RequestBranding.Submit();
        RequestBranding.Components.LogoErrorMessage().should('be.visible');

        RequestBranding.UploadBrandImage('cds2.jpg', 'image/png');
        RequestBranding.Components.BrandPreview().should('be.visible');

    });

    it('Allows submission when all valid data provided', () => {
        RequestBranding.UploadBrandImage('cds2.png', 'image/png');
        RequestBranding.EnterBrandName('Test Brand');
        RequestBranding.Components.SubmitButton().should('be.enabled');
    });

    it('Displays branding preview', () => {
        RequestBranding.UploadBrandImage('cds2.png', 'image/png');
        RequestBranding.Components.BrandPreview().should('be.visible');
    });

    // it('[NOT IMPLEMENTED] Rejects malicious files', () => {
    //     RequestBranding.EnterBrandName('Test Brand');
    //     RequestBranding.UploadMalciousFile();
    //     RequestBranding.Components.SubmitButton().should('be.disabled');
    // });
});