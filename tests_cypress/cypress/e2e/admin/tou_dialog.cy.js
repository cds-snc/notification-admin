import TouDialog from "../../Notify/Admin/Pages/TouDialog";

describe("TOU Dialog", () => {
  it("Is accessible and has valid HTML", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.a11yScan("/", {
      a11y: true,
      htmlValidate: true,
      deadLinks: false,
      mimeTypes: false,
    });
  });

  it("should display the modal when logged in", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.visit("/");

    TouDialog.Components.Dialog().should("be.visible");
    // ensure the heading element has the autofocus attribute
    TouDialog.Components.Heading().should("have.attr", "autofocus");
  });

  it("should not display the modal after being dismissed", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.visit("/");

    TouDialog.Components.Dialog().should("be.visible");
    TouDialog.AgreeToTerms();
    TouDialog.Components.Dialog().should("not.exist");

    cy.visit("/activity");
    TouDialog.Components.Dialog().should("not.exist");
  });

  it("should not display the modal when not logged in", () => {
    cy.visit("/");

    TouDialog.Components.Dialog().should("not.exist");
  });

  it("should not be displayed on any GCA page when logged in or out", () => {
    cy.visit("/features");
    TouDialog.Components.Dialog().should("not.exist");

    cy.visit("/security");
    TouDialog.Components.Dialog().should("not.exist");

    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));

    cy.visit("/features");
    TouDialog.Components.Dialog().should("not.exist");

    cy.visit("/security");
    TouDialog.Components.Dialog().should("not.exist");
  });

  it("should display the modal again when navigating to the page before modal is dismissed", () => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.visit("/");
    TouDialog.Components.Dialog().should("be.visible");

    cy.visit("/accounts");
    TouDialog.Components.Dialog().should("be.visible");
  });
});
