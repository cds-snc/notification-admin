/// <reference types="cypress" />

describe("Skip Links Accessibility", () => {
  const pages = [
    { url: `/`, name: "Home" },
    { url: `/sign-in`, name: "Sign in" },
    { url: `/register`, name: "Register" },
    { url: `/features`, name: "Features" },
  ];

  pages.forEach(({ url, name }) => {
    it(`${name} page has functioning skip link`, () => {
      cy.visit(url);

      // Check that skip link exists
      cy.get('a[href*="#main_content"]').should("exist").as("skipLink");

      // Verify skip link is accessible and has appropriate text
      cy.get("@skipLink")
        .should("be.visible")
        .should("contain.text", "Skip")
        .should("have.attr", "href");

      // Get the target ID from href
      cy.get("@skipLink")
        .invoke("attr", "href")
        .then((href) => {
          const targetId = href.replace("#", "");

          // Verify target element exists
          cy.get(`#${targetId}, #main_content, main, [role="main"]`)
            .should("exist")
            .as("mainContent");
        });

      // Test keyboard navigation functionality
      cy.get("body").press(Cypress.Keyboard.Keys.TAB); // First tab should focus skip link
      cy.focused().should("contain.text", "Skip");

      // Test that clicking/activating skip link moves focus
      cy.get("@skipLink").click();

      // Verify focus moved to main content area
      cy.focused().should("satisfy", ($el) => {
        return (
          $el.is('#main_content, #main-content, main, [role="main"]') ||
          $el.closest('#main_content, #main-content, main, [role="main"]').length > 0
        );
      });
    });
  });

  it("Skip link appears early in tab order", () => {
    cy.visit(`/`);

    // Start from body and tab through first few elements
    cy.get("body").press(Cypress.Keyboard.Keys.TAB);

    // First or second focusable element should be skip link
    cy.focused().then(($focused) => {
      if (!$focused.text().toLowerCase().includes("skip")) {
        cy.get("body").press(Cypress.Keyboard.Keys.TAB);
        cy.focused().should("contain.text", "Skip");
      }
    });
  });

  it("Skip link is visually hidden by default but visible on focus", () => {
    cy.visit(`/`);

    cy.get('a[href*="#main_content"]').as("skipLink");

    // Skip link should be visually hidden initially or positioned off-screen
    cy.get("@skipLink").should("satisfy", ($el) => {
      const computedStyle = window.getComputedStyle($el[0]);
      // Check for common hiding techniques
      return (
        computedStyle.position === "absolute" ||
        computedStyle.opacity === "0" ||
        computedStyle.height === "1px" ||
        computedStyle.overflow === "hidden" ||
        $el.hasClass("sr-only") ||
        $el.hasClass("visually-hidden") ||
        $el.hasClass("skiplink")
      );
    });

    // When focused, skip link should become visible
    cy.get("@skipLink").focus();
    cy.get("@skipLink").should("be.visible");
  });
});
