/// <reference types="cypress" />

import {
  EmailBrandingPage,
  ManageEmailBrandingPage,
} from "../../../Notify/Admin/Pages/all";

describe("Email Branding", () => {
  context("Branding Validation", () => {
    beforeEach(() => {
      cy.loginAsPlatformAdmin();
      cy.visit("/email-branding");
    });

    it("Shows an error banner when creating email branding who's name is already taken", () => {
      cy.get(".email-brand").then(($brand) => {
        let nameToDuplicate = $brand[0].children[0].innerText;
        EmailBrandingPage.CreateBranding();
        // Fill form
        ManageEmailBrandingPage.SetBrandName(nameToDuplicate);
        ManageEmailBrandingPage.SetBrandAltTextEn("Alt Text EN");
        ManageEmailBrandingPage.SetBrandAltTextFr("Alt Text FR");
        ManageEmailBrandingPage.SetBrandType(ManageEmailBrandingPage.BrandingTypes.BOTH_ENGLISH);
        ManageEmailBrandingPage.Submit();

        cy.get(".banner-dangerous")
          .should("be.visible")
          .and(
            "contain",
            "Email branding already exists, name must be unique.",
          );
      });
    });

    it("Shows an error banner when updating email branding name to one that's already taken", () => {
      cy.get(".email-brand").then(($brand) => {
        if ($brand.length < 2) {
          cy.log(
            "TODO: Add additional branding when there are less than 2 available. Skipping for now, not enough brands to test with",
          );
          expect(true).to.eq(true);
          return;
        }

        let nameToDuplicate = $brand[0].children[0].innerText;
        let brandToEdit = $brand[1].children[0].innerText;
        EmailBrandingPage.EditBrandingByName(brandToEdit);
        // Fill form
        ManageEmailBrandingPage.SetBrandName(nameToDuplicate);
        ManageEmailBrandingPage.SetBrandAltTextEn("Alt Text EN");
        ManageEmailBrandingPage.SetBrandAltTextFr("Alt Text FR");
        ManageEmailBrandingPage.SetBrandType(ManageEmailBrandingPage.BrandingTypes.BOTH_ENGLISH);
        ManageEmailBrandingPage.Submit();

        cy.get(".banner-dangerous")
          .should("be.visible")
          .and(
            "contain",
            "Email branding already exists, name must be unique.",
          );
      });
    });
  });
});
