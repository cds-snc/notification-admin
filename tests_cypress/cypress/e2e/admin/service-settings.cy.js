/// <reference types="cypress" />

import config from "../../../config";
import { ServiceSettingsPage } from "../../Notify/Admin/Pages/AllPages";

describe("Service Settings", () => {
  // Login to notify before the test suite starts
  before(() => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
  });

  beforeEach(() => {
    // stop the recurring dashboard fetch requests
    cy.intercept("GET", "**/dashboard.json", {});
    cy.visit(
      config.Hostnames.Admin +
        `/services/${config.Services.Cypress}/service-settings`,
    );
  });

  it("Loads service settings page", () => {
    cy.get("h1").contains("Settings").should("be.visible");
  });

  it("Loads branding settings page", () => {
    ServiceSettingsPage.ClickChangeEmailBrandingLink();
    cy.get("h1").contains("Email logo").should("be.visible");
  });
});
