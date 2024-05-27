import TouPrompt from "../../Notify/Admin/Pages/TouPrompt";

describe("TOU Prompt", () => {
  it("should display the modal when logged in", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"), false);
    cy.visit("/");

    TouPrompt.Components.Prompt().should("be.visible");
    // ensure the heading element has the autofocus attribute
    TouPrompt.Components.Heading().should("have.attr", "autofocus");
  });

  it("should not display the modal after being dismissed", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"), false);
    cy.visit("/");

    TouPrompt.Components.Prompt().should("be.visible");
    TouPrompt.AgreeToTerms();
    TouPrompt.Components.Prompt().should("not.exist");

    cy.visit("/activity");
    TouPrompt.Components.Prompt().should("not.exist");
  });

  it("should not display the modal when not logged in", () => {
    cy.visit("/");

    TouPrompt.Components.Prompt().should("not.exist");
  });

  it("should not be displayed on any GCA page when logged in or out", () => {
    cy.visit("/features");
    TouPrompt.Components.Prompt().should("not.exist");

    cy.visit("/security");
    TouPrompt.Components.Prompt().should("not.exist");

    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"), false);

    cy.visit("/features");
    TouPrompt.Components.Prompt().should("not.exist");

    cy.visit("/security");
    TouPrompt.Components.Prompt().should("not.exist");
  });

  it("should display the modal again when navigating to the page before modal is dismissed", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"), false);
    cy.visit("/");
    TouPrompt.Components.Prompt().should("be.visible");

    cy.visit("/accounts");
    TouPrompt.Components.Prompt().should("be.visible");
  });
});
