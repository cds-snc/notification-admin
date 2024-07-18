/// <reference types="cypress" />

import config from "../../../config";
import { TemplateFiltersPage as Page } from "../../Notify/Admin/Pages/all";

const types = {
  en: ["Email template", "Text message template"],
  fr: ["Gabarit de courriel", "Gabarit de message texte"],
};

const categories = {
  en: ["Testing"],
  fr: ["Test"],
};

describe("Template filters", () => {
  beforeEach(() => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
  });

  // Filters should be set to all by default
  it("should be collapsed and set to all by default", () => {
    cy.visit(`/services/${config.Services.Cypress}/templates`);
    //localhost:6012/set-lang?from=/services/5c8a0501-2aa8-433a-ba51-cefb8063ab93/templates
    // ensure the first type filter is active by default and no others are
    http: Page.Components.TypeFilter()
      .find("a")
      .first()
      .should("have.class", "active");
    Page.Components.TypeFilter()
      .find("a")
      .not(":first")
      .should("not.have.class", "active");

    // ensure the first category filter is active by default and no others are
    Page.Components.CategoryFilter()
      .find("a")
      .first()
      .should("have.class", "active");
    Page.Components.CategoryFilter()
      .find("a")
      .not(":first")
      .should("not.have.class", "active");

    Page.Components.Filter().should("not.have.attr", "open");
  });

  it("should toggle", () => {
    cy.visit(`/services/${config.Services.Cypress}/templates`);

    Page.ToggleFilters();
    Page.Components.Filter().should("have.attr", "open");

    Page.ToggleFilters();
    Page.Components.Filter().should("not.have.attr", "open");
  });
  // Filter by email and assert the correct number of templates are shown
  ["en", "fr"].forEach((lang) => {
    const url =
      lang == "en"
        ? `/services/${config.Services.Cypress}/templates`
        : `/set-lang?from=/services/${config.Services.Cypress}/templates`;
    context(`Filtering in ${lang}`, () => {
      context("Filtering by type", () => {
        types[lang].forEach((type) => {
          it(`${type}: displays the correct number of rows`, () => {
            cy.visit(url);

            // Test type filter works
            Page.Components.Templates()
              .filter(`[data-notification-type="${type}"]`)
              .then((templates) => {
                const emailRows = templates.length;

                Page.ToggleFilters();
                Page.Components.TypeFilter().find("a").contains(type).click();
                Page.Components.CategoryFilter()
                  .find("a")
                  .contains("All")
                  .click();
                Page.Components.Templates()
                  .filter(":visible")
                  .should("have.length", emailRows);
              });
          });
        });
      });

      context("Filtering by category", () => {
        categories[lang].forEach((type) => {
          it(`${type}: displays the correct number of rows`, () => {
            cy.visit(url);

            // Test type filter works
            Page.Components.Templates()
              .filter(`[data-template-category="${type}"]`)
              .then((templates) => {
                const emailRows = templates.length;

                Page.ToggleFilters();
                Page.Components.CategoryFilter()
                  .find("a")
                  .contains(type)
                  .click();
                Page.Components.TypeFilter().find("a").contains("All").click();
                Page.Components.Templates()
                  .filter(":visible")
                  .should("have.length", emailRows);
              });
          });
        });
      });

      it("Resetting filters should show all templates", () => {
        cy.visit(url);
        Page.Components.Templates()
          .filter(":visible")
          .then((templates) => {
            const emailRows = templates.length;

            // Filter rows
            Page.ToggleFilters();
            Page.Components.TypeFilter()
              .find("a")
              .contains(types[lang][0])
              .click();
            Page.Components.CategoryFilter()
              .find("a")
              .contains(categories[lang][0])
              .click();

            // Clear filters
            Page.Components.TypeFilter().find("a").contains("All").click();
            Page.Components.CategoryFilter().find("a").contains("All").click();

            Page.Components.Templates()
              .filter(":visible")
              .should("have.length", emailRows);
          });
      });
    });
  });
});
