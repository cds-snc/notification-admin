/// <reference types="cypress" />

import config from "../../../../config";
import { TemplatesPage } from "../../../Notify/Admin/Pages/all";
import { Admin } from "../../../Notify/NotifyAPI";

describe("Create Template", () => {
  context.skip("FF_TEMPLATE_CATEGORY - OFF", () => {
    it("Process type defaults to bulk if non-admin", () => {
      cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
      cy.visit(`/services/${config.Services.Cypress}/templates`);

      TemplatesPage.CreateTemplate();
      TemplatesPage.SelectTemplateType("email");
      TemplatesPage.Continue();
      TemplatesPage.FillTemplateForm(
        "Test Template",
        "Test Subject",
        "Test Content",
      );

      TemplatesPage.SaveTemplate();

      cy.url().then((url) => {
        let templateId = url.split("/templates/")[1];
        Admin.GetTemplate({
          templateId: templateId,
          serviceId: config.Services.Cypress,
        }).then((response) => {
          let template = response.body.data;
          expect(template.process_type_column).to.be.equal("bulk");
          expect(template.template_category_id).to.be.a("null");
          expect(template.process_type).to.be.equal("bulk");
          Admin.DeleteTemplate({
            templateId: templateId,
            serviceId: config.Services.Cypress,
          });
        });
      });
    });

    it.skip("Process type defaults to bulk if admin", () => {
      cy.login(
        Cypress.env("NOTIFY_ADMIN_USER"),
        Cypress.env("NOTIFY_PASSWORD"),
      );
      cy.visit(`/services/${config.Services.Cypress}/templates`);

      TemplatesPage.CreateTemplate();
      TemplatesPage.SelectTemplateType("email");
      TemplatesPage.Continue();
      TemplatesPage.FillTemplateForm(
        "Test Template",
        "Test Subject",
        "Test Content",
      );

      TemplatesPage.SaveTemplate();

      cy.url().then((url) => {
        let templateId = url.split("/templates/")[1];
        Admin.GetTemplate({
          templateId: templateId,
          serviceId: config.Services.Cypress,
        }).then((response) => {
          let template = response.body.data;
          expect(template.process_type_column).to.be.equal("bulk");
          expect(template.template_category_id).to.be.a("null");
          expect(template.process_type).to.be.equal("bulk");
          Admin.DeleteTemplate({
            templateId: templateId,
            serviceId: config.Services.Cypress,
          });
        });
      });
    });
  });

  context("FF_TEMPLATE_CATEGORY - ON", () => {
    it("Process type should be null and the category process type should be used if non-admin", () => {
      cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
      cy.visit(`/services/${config.Services.Cypress}/templates`);
      TemplatesPage.CreateTemplate();
      TemplatesPage.SelectTemplateType("email");
      TemplatesPage.Continue();
      TemplatesPage.FillTemplateForm(
        "Test Template",
        "Test Subject",
        "Test Content",
        "Alert",
      );
      TemplatesPage.SaveTemplate();

      cy.url().then((url) => {
        let templateId = url.split("/templates/")[1];
        Admin.GetTemplate({
          templateId: templateId,
          serviceId: config.Services.Cypress,
        }).then((response) => {
          let template = response.body.data;
          expect(template.process_type_column).to.be.a("null");
          expect(template.template_category_id).to.not.be.a("null");
          expect(template.process_type).to.be.equal("normal"); // Alert category process type is normal
          Admin.DeleteTemplate({
            templateId: templateId,
            serviceId: config.Services.Cypress,
          });
        });
      });
    });

    it("Process type should be null and the category process type should be used if admin", () => {
      cy.login(
        Cypress.env("NOTIFY_ADMIN_USER"),
        Cypress.env("NOTIFY_PASSWORD"),
      );
      cy.visit(`/services/${config.Services.Cypress}/templates`);
      TemplatesPage.CreateTemplate();
      TemplatesPage.SelectTemplateType("email");
      TemplatesPage.Continue();
      TemplatesPage.FillTemplateForm(
        "Test Template",
        "Test Subject",
        "Test Content",
        "Alert",
        "__use_tc",
      );
      TemplatesPage.SaveTemplate();

      cy.url().then((url) => {
        let templateId = url.split("/templates/")[1];
        Admin.GetTemplate({
          templateId: templateId,
          serviceId: config.Services.Cypress,
        }).then((response) => {
          let template = response.body.data;
          expect(template.process_type_column).to.be.a("null");
          expect(template.template_category_id).to.not.be.a("null");
          expect(template.process_type).to.be.equal("normal"); // Alert category process type is normal
          Admin.DeleteTemplate({
            templateId: templateId,
            serviceId: config.Services.Cypress,
          });
        });
      });
    });
  });
});
