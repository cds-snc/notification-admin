/// <reference types="cypress" />

import config from "../../../../config";
import {
  EditBranding,
  BrandingSettings,
} from "../../../Notify/Admin/Pages/all";
import EditBrandingPage from "../../../Notify/Admin/Pages/branding/EditBrandingPage";

describe("Edit Branding", () => {
  // Login to notify before the test suite starts
  before(() => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
  });

  beforeEach(() => {
    // stop the recurring dashboard fetch requests
    cy.intercept("GET", "**/dashboard.json", {});
    cy.visit(
      config.Hostnames.Admin +
        `/services/${config.Services.Cypress}/edit-branding`,
    );
  });

  it("Loads branding settings page", () => {
    cy.visit(
      config.Hostnames.Admin + `/services/${config.Services.Cypress}/branding`,
    );
    cy.get("h1").contains("Email logo").should("be.visible");
  });

  it("Shows images of the default EN and FR branding", () => {
    EditBranding.Components.BrandFieldset().within(() => {
      cy.get("img")
        .first()
        .should("have.attr", "src")
        .then((src) => {
          expect(src).to.include("gc-logo-en.png");
        });
      cy.get("img")
        .last()
        .should("have.attr", "src")
        .then((src) => {
          expect(src).to.include("gc-logo-fr.png");
        });
    });
  });

  it("Loads edit-branding when choose logo is clicked", () => {
    cy.visit(
      config.Hostnames.Admin + `/services/${config.Services.Cypress}/branding`,
    );
    BrandingSettings.ChooseDifferentLogo();
    cy.get("h1").contains("Change your logo").should("be.visible");
  });

  it("Cannot submit when no selection was made", () => {
    EditBranding.Submit();
    EditBrandingPage.Components.ErrorMessage().should("be.visible");
  });

  it("Saves English-first logo when selected", () => {
    EditBranding.SelectDefaultBranding("en");
    EditBranding.Submit();
    BrandingSettings.Components.StatusBanner()
      .should("be.visible")
      .and("contain", "Setting updated");
    BrandingSettings.Components.TemplatePreview()
      .first()
      .should(
        "have.attr",
        "alt",
        "Government of Canada / Gouvernement du Canada",
      );
  });

  it("Saves French-first logo when selected", () => {
    EditBranding.SelectDefaultBranding("fr");
    EditBranding.Submit();
    BrandingSettings.Components.StatusBanner()
      .should("be.visible")
      .and("contain", "Setting updated");
    BrandingSettings.Components.TemplatePreview()
      .first()
      .should(
        "have.attr",
        "alt",
        "Gouvernement du Canada / Government of Canada",
      );
  });

  it("Navigates to branding pool when select another logo from test link is clicked", () => {
    EditBranding.ClickBrandPool();
    cy.contains("h1", "Select another logo").should("be.visible");
  });

  it("Navigates to edit branding when go back is clicked from the branding pool page", () => {
    EditBranding.ClickBrandPool();
    BrandingSettings.GoBack();
    cy.get("h1").contains("Change your logo").should("be.visible");
  });
});
