/// <reference types="cypress" />

import { TemplatesPage } from "../../../Notify/Admin/Pages/all";
import { Admin } from "../../../Notify/NotifyAPI";
import { getServiceID } from "../../../support/utils";

const CYPRESS_SERVICE_ID = getServiceID("CYPRESS");
const PERF_REPEAT = Number(Cypress.env("PERF_REPEAT") || 5);

describe("Admin performance smoke", () => {
  before(() => {
    cy.login();
  });

  beforeEach(() => {
    cy.intercept("GET", "**/dashboard.json", {}).as("dashboardPoll");
  });

  for (let iteration = 1; iteration <= PERF_REPEAT; iteration += 1) {
    it(`measures authenticated admin journeys run ${iteration}`, () => {
      cy.startPerfCapture({
        label: "admin-performance-smoke",
        metadata: {
          suite: "admin-performance-smoke",
          iteration,
          warmupRun: iteration === 1,
        },
      });

      cy.measureVisit(`/services/${CYPRESS_SERVICE_ID}`, "dashboard", {
        ready: () => {
          cy.contains("h1", "Dashboard").should("be.visible");
        },
      });

      cy.measureVisit(`/services/${CYPRESS_SERVICE_ID}/service-settings`, "service-settings", {
        ready: () => {
          cy.contains("h1", "Settings").should("be.visible");
        },
      });

      cy.trackRequestDuration(
        "templates-page-data",
        {
          method: "GET",
          url: "**/service/*/templates**",
        },
        () => {
          cy.measureVisit(`/services/${CYPRESS_SERVICE_ID}/templates`, "templates-list", {
            ready: () => {
              cy.contains("h1", "Templates").should("be.visible");
            },
          });
        },
      );

      cy.trackRequestDuration(
        "template-create",
        {
          method: "POST",
          url: "**/service/*/template",
        },
        () => {
          TemplatesPage.CreateTemplate();
          TemplatesPage.SelectTemplateType("email");
          TemplatesPage.Continue();
          TemplatesPage.FillTemplateForm(
            `Performance Template ${iteration}`,
            `Performance Subject ${iteration}`,
            `Performance Content ${iteration}`,
            "Alert",
          );
          TemplatesPage.SaveTemplate();
        },
        {
          timeout: 120000,
        },
      );

      cy.contains("h1", /Edit .* template/i).should("be.visible");

      cy.url().then((url) => {
        const templateId = url.split("/templates/")[1];

        if (templateId) {
          Admin.DeleteTemplate({
            serviceId: CYPRESS_SERVICE_ID,
            templateId,
          });
        }
      });

      cy.flushPerfArtifact("admin-performance-smoke", {
        iteration,
        warmupRun: iteration === 1,
      });
    });
  }
});