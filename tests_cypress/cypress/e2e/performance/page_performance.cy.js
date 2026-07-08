/// <reference types="cypress" />

/**
 * Performance tests for a service with many templates and notifications.
 *
 * These tests verify that pages load within acceptable performance thresholds
 * when dealing with large datasets. The tests dynamically find the
 * 'test-simulate-prod-data-service' service and its folder.
 */

const SERVICE_NAME = "test-simulate-prod-data-service";
const FOLDER_NAME = "test-simulate-prod-data-folder-high-volume";
const LOAD_TIME_THRESHOLD = 2000; // 2 seconds in milliseconds

// URL patterns — {serviceId} is replaced at runtime after discovering the service
const URLS = {
  SERVICE_LIST: "/platform-admin/live-services",
  DASHBOARD: "/services/{serviceId}",
  TEMPLATES: "/services/{serviceId}/templates",
  NOTIFICATIONS:
    "/services/{serviceId}/notifications/email?status=sending,delivered,failed",
};

/**
 * Visits a URL, measures wall-clock time for cy.visit() to resolve (including
 * network idle), then asserts the total duration is under LOAD_TIME_THRESHOLD.
 *
 * @param {string} url   - The URL to visit
 * @param {string} label - Human-readable label for the page being tested
 */
const visitAndAssertPerformance = (url, label) => {
  const start = Date.now();
  cy.visit(url, { timeout: 10000 }).then(() => {
    const totalDuration = Date.now() - start;
    cy.log(`--- ${label} ---`);
    cy.log(`Total load time (wall clock): ${totalDuration}ms`);
    expect(totalDuration, `${label} total load time`).to.be.lessThan(
      LOAD_TIME_THRESHOLD,
    );
  });
};

describe("Page performance Tests - many templates/notifications", () => {
  let serviceId;

  before(() => {
    cy.loginAsPlatformAdmin();
    cy.visit(URLS.SERVICE_LIST);
    cy.get("body")
      .contains(SERVICE_NAME)
      .then(($element) => {
        const href = $element.closest("a").attr("href");
        const match = href.match(/\/services\/([a-f0-9-]+)/);
        if (match) {
          serviceId = match[1];
          cy.log(`Found service ID: ${serviceId}`);
        }
      });
  });

  beforeEach(() => {
    cy.loginAsPlatformAdmin();
  });

  it("Service dashboard should load in under 2 seconds", () => {
    visitAndAssertPerformance(
      URLS.DASHBOARD.replace("{serviceId}", serviceId),
      "Dashboard",
    );
  });

  it("Templates list should load in under 2 seconds", () => {
    visitAndAssertPerformance(
      URLS.TEMPLATES.replace("{serviceId}", serviceId),
      "Templates list",
    );
  });

  it("Template folder should load in under 2 seconds", () => {
    // Navigate to templates first to find the folder link
    cy.visit(URLS.TEMPLATES.replace("{serviceId}", serviceId));

    // Find the folder link — an <a> with a child <span> containing the folder name
    cy.get("a span")
      .contains(FOLDER_NAME)
      .then(($element) => {
        const href = $element.closest("a").attr("href");
        visitAndAssertPerformance(href, "Template folder");
      });
  });

  it("Notifications list should load in under 2 seconds", () => {
    visitAndAssertPerformance(
      URLS.NOTIFICATIONS.replace("{serviceId}", serviceId),
      "Notifications list",
    );
  });
});
