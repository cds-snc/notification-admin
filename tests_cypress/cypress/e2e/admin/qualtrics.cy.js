/// <reference types="cypress" />

import { LoginPage } from "../../Notify/Admin/Pages/all";

describe("Qualtrics", () => {
  // Login to notify before the test suite starts
  before(() => {
    LoginPage.Login();
  });

  // Before each test, persist the auth cookie so we don't have to login again
  beforeEach(() => {
    // stop the recurring dashboard fetch requests
    cy.intercept("GET", "**/dashboard.json", {});
  });

  it("survey button appears and survey opens", () => {
    cy.visit(`/services/${config.Services.Cypress}`);
    cy.contains("h1", "Dashboard").should("be.visible");
    cy.get("#QSIFeedbackButton-btn").should("be.visible"); // qualtrics survey button
    cy.get("#QSIFeedbackButton-btn").click(); // click the button
    cy.get("#QSIFeedbackButton-survey-iframe").should("be.visible"); //
  });
});
