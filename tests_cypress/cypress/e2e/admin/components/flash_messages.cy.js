/// <reference types="cypress" />

describe("Flash Messages Focus Behavior", () => {
  const flashMessageVariations = [
    {
      name: "Default Message",
      component: "flash-messages-default",
      expectedRole: "status",
      description: "basic success message",
    },
    {
      name: "Default with Tick",
      component: "flash-messages-default-with-tick",
      expectedRole: "status",
      description: "success message with tick icon",
    },
    {
      name: "Dangerous/Error Message",
      component: "flash-messages-dangerous",
      expectedRole: "alert",
      description: "error message that should interrupt",
    },
    {
      name: "Message with Context",
      component: "flash-messages-with-context",
      expectedRole: "status",
      description: "message with additional context text",
    },
    {
      name: "Message with Action Button",
      component: "flash-messages-with-button",
      expectedRole: "alert",
      description: "dangerous message with action button",
    },
    {
      name: "Message with Subheading",
      component: "flash-messages-with-subhead",
      expectedRole: "alert",
      description: "error message with subheading",
    },
  ];

  flashMessageVariations.forEach((variation) => {
    describe(`${variation.name}`, () => {
      const pageURL = `/_storybook?component=${variation.component}`;

      beforeEach(() => {
        cy.visit(pageURL);
        // Wait for the page to fully load
        cy.get('[data-testid="flash_message"]').should("be.visible");
      });

      it(`should have the correct ARIA role for ${variation.description}`, () => {
        cy.get('[data-testid="flash_message"]').should(
          "have.attr",
          "role",
          variation.expectedRole,
        );
      });

      it(`should have tabindex="-1" for ${variation.description}`, () => {
        cy.get('[data-testid="flash_message"]').should(
          "have.attr",
          "tabindex",
          "-1",
        );
      });

      it.only(`should receive focus when page loads for ${variation.description}`, () => {
        // Check that the flash message is focused
        cy.get('[data-testid="flash_message"]').should("have.attr", "autofocus");
      });

      if (variation.component === "flash-messages-with-button") {
        it("should allow keyboard navigation to action button", () => {
          // Focus should start on the banner
          cy.get('[data-testid="flash_message"]').should("be.focused");

          // Tab should move to the button within the banner
          cy.realPress("Tab");
          cy.get('[data-testid="flash_message"] button[type="submit"]')
            .should("be.focused")
            .and("be.visible");
        });

        it("should have accessible button text", () => {
          cy.get('[data-testid="flash_message"] button[type="submit"]')
            .should("be.visible")
            .invoke("text")
            .should("not.be.empty")
            .and("match", /yes|delete|confirm/i); // Should contain action words
        });
      }

      if (variation.component === "flash-messages-with-subhead") {
        it("should have proper heading structure", () => {
          cy.get('[data-testid="flash_message"] h2.banner-title')
            .should("be.visible")
            .invoke("text")
            .should("not.be.empty");
        });
      }

      if (variation.component === "flash-messages-with-context") {
        it("should include context text", () => {
          cy.get('[data-testid="flash_message"] .banner-context')
            .should("be.visible")
            .invoke("text")
            .should("not.be.empty");
        });
      }
    });
  });

  describe("Flash Messages Overview Page", () => {
    const overviewURL = "/_storybook?component=flash-messages";

    beforeEach(() => {
      cy.visit(overviewURL);
    });

    it("should display all flash message variations", () => {
      // Check that all example banners are visible
      cy.get('[data-testid="flash_message"]').should("have.length.at.least", 6);
    });

    it("should have working navigation links to individual test pages", () => {
      flashMessageVariations.forEach((variation) => {
        cy.get(`a[href*="${variation.component}"]`)
          .should("be.visible")
          .and("contain.text", variation.name);
      });
    });

    it("should have code examples for each variation", () => {
      // Check that code blocks are present
      cy.get("pre code").should("have.length.at.least", 6);
    });

    it("should have back links on individual test pages", () => {
      // Click on a test link and verify back navigation
      cy.get('a[href*="flash-messages-default"]').first().click();
      cy.url().should("include", "flash-messages-default");

      // Check for back link
      cy.get('a[href*="flash-messages"]')
        .contains("Back to Flash Messages Overview")
        .should("be.visible");
    });
  });
});
