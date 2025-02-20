/// <reference types="cypress" />

import config from "../../../../config";

import {
  ReviewPoolPage,
  EditBrandingPage,
  PreviewBrandingPage,
  BrandingSettingsPage,
} from "../../../Notify/Admin/Pages/all";

import { Admin } from "../../../Notify/NotifyAPI";

describe("Review Pool", () => {

  context("General page functionality", () => {
    before(() => {
      Admin.ClearCache({ pattern: `service-${config.Services.Cypress}` });
      // Link the test service to the org without branding
      Admin.LinkOrganisationToService({
        orgId: config.Organisations.DEFAULT_ORG_ID,
        serviceId: config.Services.Cypress,
      });
    });

    beforeEach(() => {
      cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
      cy.visit(`/services/${config.Services.Cypress}/review-pool`);
    });

    it("Loads review pool page", () => {
      cy.contains("h1", "Select another logo").should("be.visible");
      ReviewPoolPage.Components.AvailableLogos().each((element) => {
        cy.wrap(element).find("img").should("exist");
      });
    });

    it("Loads request branding page when [request a new logo] link is clicked", () => {
      ReviewPoolPage.ClickRequestNewLogoLink();
      cy.get("h1").contains("Request a new logo").should("be.visible");
    });

    it("Returns to edit branding page when back link is clicked", () => {
      cy.visit(`/services/${config.Services.Cypress}/edit-branding`);
      EditBrandingPage.ClickBrandPool();
      ReviewPoolPage.ClickBackLink();
      cy.get("h1").contains("Change your logo").should("be.visible");
    });
  });

  context("Service's org has no custom branding", () => {
    before(() => {
      Admin.ClearCache({ pattern: `service-${config.Services.Cypress}` });
      // Link the test service to the org without branding
      Admin.LinkOrganisationToService({
        orgId: config.Organisations.NO_CUSTOM_BRANDING_ORG_ID,
        serviceId: config.Services.Cypress,
      });

      cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
      cy.visit(`/services/${config.Services.Cypress}/review-pool`);
    });

    it("Displays a banner indicating there is no custom branding associated with their organisation and a link to request custom branding", () => {
      ReviewPoolPage.Components.EmptyListContainer().should("be.visible");
      cy.contains("a", "Request a new logo").should("be.visible");
    });
  });

  context("Service's org has custom branding", () => {
    before(() => {
      // Clear the Cypress service cache so we pick up the new org
      Admin.ClearCache({ pattern: `service-${config.Services.Cypress}` });
      Admin.LinkOrganisationToService({
        orgId: config.Organisations.DEFAULT_ORG_ID,
        serviceId: config.Services.Cypress,
      });
    });

    beforeEach(() => {
      cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
      cy.visit(
        config.Hostnames.Admin +
          `/services/${config.Services.Cypress}/review-pool`,
      );
    });

    it("Displays a list of available logos", () => {
      // In a full E2E test, we would check for exactly the number of logos
      // associated with the service's org
      ReviewPoolPage.Components.AvailableLogoRadios().should("exist");
    });

    it("Saves the selected custom logo and displays confirmation banner and preview image", () => {
      ReviewPoolPage.SelectLogoRadio();
      ReviewPoolPage.ClickPreviewButton();
      cy.contains("h1", "Logo preview").should("be.visible");
      PreviewBrandingPage.ClickSaveBranding();
      BrandingSettingsPage.Components.StatusBanner().should("be.visible");
      BrandingSettingsPage.Components.TemplatePreview().should("be.visible");
      BrandingSettingsPage.Components.TemplatePreview().should(
        "have.attr",
        "alt",
      );
    });
  });
});
