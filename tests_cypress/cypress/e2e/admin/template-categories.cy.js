/// <reference types="cypress" />

import config from "../../../config";
import { TemplatesPage } from "../../Notify/Admin/Pages/all";

describe("Template categories", () => {
  beforeEach(() => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.visit(`/services/${config.Services.Cypress}/templates`);
  });

  const templates = [
    {
      type: "email",
      name: "SMOKE_TEST_EMAIL",
    },
    {
      type: "sms",
      name: "SMOKE_TEST_SMS",
    },
  ];

  templates.forEach((template) => {
    context(`${template.type}`, () => {
      it("Passes a11y checks", () => {
        TemplatesPage.SelectTemplate(template.name);
        cy.a11yScan(false, {
          a11y: true,
          htmlValidate: true,
          deadLinks: false,
          mimeTypes: false,
          axeConfig: false,
        });

        TemplatesPage.EditCurrentTemplate();
        cy.a11yScan(false, {
          a11y: true,
          htmlValidate: true,
          deadLinks: false,
          mimeTypes: false,
          axeConfig: false,
        });

        TemplatesPage.ExpandTemplateCategories();
        cy.a11yScan(false, {
          a11y: true,
          htmlValidate: true,
          deadLinks: false,
          mimeTypes: false,
          axeConfig: false,
        });
      });

      it("Shows collapsed or expanded when editing a template", () => {
        TemplatesPage.SelectTemplate(template.name);
        TemplatesPage.EditCurrentTemplate();
        TemplatesPage.Components.TemplateCategoryButtonContainer().should(
          "be.visible",
        );
        TemplatesPage.Components.TemplateCategoryRadiosContainer().should(
          "not.be.visible",
        );

        TemplatesPage.ExpandTemplateCategories();
        TemplatesPage.Components.TemplateCategories().should("be.visible");
      });

      it("Template can be saved when category is collapsed", () => {
        TemplatesPage.SelectTemplate(template.name);
        TemplatesPage.EditCurrentTemplate();
        TemplatesPage.SaveTemplate();
      });

      it("Category shows as full list when creating a new template", () => {
        TemplatesPage.CreateTemplate();
        TemplatesPage.SelectTemplateType(template.type);
        TemplatesPage.Continue();

        TemplatesPage.Components.TemplateCategories().should("be.visible");
      });

      it("Template category must be provided for template to be saved", () => {
        TemplatesPage.CreateTemplate();
        TemplatesPage.SelectTemplateType(template.type);
        TemplatesPage.Continue();

        TemplatesPage.SaveTemplate();
        TemplatesPage.Components.TemplateCategories()
          .find(".error-message")
          .should("be.visible");
      });

      it("Category label must be provided when “other” template category selected in order to save template ", () => {
        TemplatesPage.SelectTemplate(template.name);
        TemplatesPage.EditCurrentTemplate();
        TemplatesPage.ExpandTemplateCategories();
        TemplatesPage.SelectTemplateCategory("Other");

        TemplatesPage.SaveTemplate();
        TemplatesPage.Components.TemplateCategories()
          .find(".error-message")
          .should("be.visible");
      });
    });
  });
});
