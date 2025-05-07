/// <reference types="cypress" />

import {
  TemplateCategoriesPage,
  ManageTemplateCategoryPage,
} from "../../../Notify/Admin/Pages/all";
import { v4 as uuid } from "uuid";

import { Admin, API, Cleanup } from "../../../Notify/NotifyAPI";

import { getTemplateCategoriesCachePattern } from "../../../../cypress/support/utils";

describe(
  "Template Categories",
  { env: { TEMPLATE_CATEGORY_ID: uuid() } },
  () => {
    beforeEach(() => {
      cy.loginAsPlatformAdmin();
      cy.visit(`/template-categories`);
    });

    describe("Template Category list", () => {
      it("Loads template categories page", () => {
        cy.contains("h1", "Template categories").should("be.visible");
      });

      it("Navigates to template-category when clicking a category name link", () => {
        TemplateCategoriesPage.Components.TemplateCategoriesTable().within(
          () => {
            cy.get("a").first().click();
          },
        );
        cy.contains("h1", "Update category").should("be.visible");
      });

      it("Navigates to template-category when clicking the 'New Category' button", () => {
        TemplateCategoriesPage.CreateTemplateCategory();
        cy.contains("h1", "Create category").should("be.visible");
      });
    });

    describe("Manage Template Categories", () => {
      beforeEach(() => {
        Cleanup.TemplateCategories({ cascade: false }).then((resp) => {
          API.ClearCache(getTemplateCategoriesCachePattern());
        });
      });

      it("Creates a new template category", () => {
        TemplateCategoriesPage.CreateTemplateCategory();
        ManageTemplateCategoryPage.FillForm(
          "New Category",
          "Nouvelle catégorie",
          "This is a new category",
          "C'est une nouvelle catégorie",
          "show",
          "low",
          "low",
          "short_code",
        );
        ManageTemplateCategoryPage.Submit();

        cy.contains("h1", "Template categories").should("be.visible");
        cy.contains("New Category").should("be.visible");
        TemplateCategoriesPage.Components.ConfirmationBanner().should(
          "be.visible",
        );
      });

      it("Updates an existing template category", () => {
        Admin.CreateTemplateCategory({
          id: Cypress.env("TEMPLATE_CATEGORY_ID"),
          name_en: "Update me",
          name_fr: "Mettre à jour",
          desc_en: "Dying to be updated",
          desc_fr: "Mourir pour être mis à jour",
          hidden: true,
          email_priority: "bulk",
          sms_priority: "bulk",
          sms_sending_vehicle: "long_code",
        }).then((resp) => {
          cy.visit(`/template-category/${resp.body.template_category.id}`);
          ManageTemplateCategoryPage.FillForm(
            "Updated",
            "Mise à jour",
            "I have been updated",
            "J'ai été mis à jour",
            "hide",
            "medium",
            "medium",
            "short_code",
          );
          ManageTemplateCategoryPage.Submit();
          cy.get(`tr[id=cds${resp.body.template_category.id}] > td`).then(
            (tds) => {
              cy.contains("Updated").should("be.visible");
              cy.contains("Medium").should("be.visible");
              cy.contains("Hide").should("be.visible");
            },
          );
        });
      });

      it("Deletes a template category", () => {
        Admin.CreateTemplateCategory({
          id: Cypress.env("TEMPLATE_CATEGORY_ID"),
          name_en: "Delete me",
          name_fr: "Supprimez-moi",
          desc_en: "Dying to be deleted",
          desc_fr: "Mourir pour être supprimé",
          hidden: true,
          email_priority: "bulk",
          sms_priority: "bulk",
          sms_sending_vehicle: "long_code",
        }).then((resp) => {
          cy.visit(`/template-category/${resp.body.template_category.id}`);
          ManageTemplateCategoryPage.DeleteTemplateCategory();
          cy.contains("Are you sure you want to delete").should("be.visible");
          ManageTemplateCategoryPage.ConfirmDeleteTemplateCategory();
          cy.contains("h1", "Template categories").should("be.visible");
          cy.contains("Delete me").should("not.exist");
        });
      });
    });

    describe("Manage Template Category validation", () => {
      before(() => {
        // Use a static category_id so we can reliably clean up the DB state before we run the tests
        cy.intercept("POST", `/template-category/add`, (request) => {
          request.body.concat(`&id=${Cypress.env("TEMPLATE_CATEGORY_ID")}`);
        });
      });

      beforeEach(() => {
        Cleanup.TemplateCategories({ cascade: false }).then((resp) => {
          API.ClearCache(getTemplateCategoriesCachePattern());
        });
      });

      it("Shows an error banner when creating a template category whose English name is already taken", () => {
        TemplateCategoriesPage.CreateTemplateCategory();
        ManageTemplateCategoryPage.FillForm(
          "Alert",
          "Nouvelle catégorie",
          "This is a new category",
          "C'est une nouvelle catégorie",
          "show",
          "low",
          "low",
          "short_code",
        );
        ManageTemplateCategoryPage.Submit();

        cy.get(".banner-dangerous")
          .should("be.visible")
          .and(
            "contain",
            "Template category already exists, name_en and name_fr must be unique.",
          );
      });

      it("Shows an error banner when creating a template category whose French name is already taken", () => {
        TemplateCategoriesPage.CreateTemplateCategory();
        ManageTemplateCategoryPage.FillForm(
          "New Category",
          "Alerte",
          "This is a new category",
          "C'est une nouvelle catégorie",
          "show",
          "low",
          "low",
          "short_code",
        );
        ManageTemplateCategoryPage.Submit();

        cy.get(".banner-dangerous")
          .should("be.visible")
          .and(
            "contain",
            "Template category already exists, name_en and name_fr must be unique.",
          );
      });

      it("Shows an error banner when updating a template category with an English name that is already taken", () => {
        Admin.CreateTemplateCategory({
          id: Cypress.env("TEMPLATE_CATEGORY_ID"),
          name_en: "Update me",
          name_fr: "Mettre à jour",
          desc_en: "Dying to be updated",
          desc_fr: "Mourir pour être mis à jour",
          hidden: true,
          email_priority: "bulk",
          sms_priority: "bulk",
          sms_sending_vehicle: "long_code",
        }).then((resp) => {
          cy.visit("/template-categories");
          TemplateCategoriesPage.EditTemplateCategoryById(
            Cypress.env("TEMPLATE_CATEGORY_ID"),
          );
          ManageTemplateCategoryPage.SetCategoryLabelEn("Alert");
          ManageTemplateCategoryPage.Submit();
          cy.get(".banner-dangerous")
            .should("be.visible")
            .and(
              "contain",
              "Template category already exists, name_en and name_fr must be unique.",
            );
        });

        it("Shows an error banner when updating a template category with a French name that is already taken", () => {
          Admin.CreateTemplateCategory({
            id: Cypress.env("TEMPLATE_CATEGORY_ID"),
            name_en: "Update me",
            name_fr: "Mettre à jour",
            desc_en: "Dying to be updated",
            desc_fr: "Mourir pour être mis à jour",
            hidden: true,
            email_priority: "bulk",
            sms_priority: "bulk",
            sms_sending_vehicle: "long_code",
          }).then((resp) => {
            TemplateCategoriesPage.EditTemplateCategoryById(
              Cypress.env("TEMPLATE_CATEGORY_ID"),
            );

            ManageTemplateCategoryPage.SetCategoryLabelFr("Alerte");
            ManageTemplateCategoryPage.Submit();
            cy.get(".banner-dangerous")
              .should("be.visible")
              .and(
                "contain",
                "Template category already exists, name_en and name_fr must be unique.",
              );
          });
        });
      });
    });
  },
);
