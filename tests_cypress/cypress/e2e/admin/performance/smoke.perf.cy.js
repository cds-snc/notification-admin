/// <reference types="cypress" />

import { getServiceID } from "../../../support/utils";

const CYPRESS_SERVICE_ID = getServiceID("CYPRESS");
const PERF_REPEAT = Number(Cypress.env("PERF_REPEAT") || 3);

describe("Admin performance smoke", { retries: 0 }, () => {
  beforeEach(() => {
    cy.loginForPerf();
    cy.intercept("GET", "**/dashboard.json", {}).as("dashboardPoll");
  });

  for (let iteration = 1; iteration <= PERF_REPEAT; iteration += 1) {
    it(`measures authenticated dashboard load run ${iteration}`, () => {
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

      cy.measureVisit(
        `/services/${CYPRESS_SERVICE_ID}/service-settings`,
        "service-settings",
        {
          ready: () => {
            cy.contains("h1", "Settings").should("be.visible");
          },
        },
      );

      cy.measureVisit(
        `/services/${CYPRESS_SERVICE_ID}/templates`,
        "templates-list",
        {
          ready: () => {
            cy.contains("h1", "Templates").should("be.visible");
          },
        },
      );

      cy.flushPerfArtifact("admin-performance-smoke", {
        iteration,
        warmupRun: iteration === 1,
      });
    });
  }
});
