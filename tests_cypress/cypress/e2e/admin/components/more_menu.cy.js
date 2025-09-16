let PageURL = "/_storybook?component=more-menu";

describe("Disclosure Menu components", () => {
  // Add handler for ResizeObserver errors
  Cypress.on("uncaught:exception", (err) => {
    // Return false to prevent Cypress from failing the test
    if (
      err.message.includes(
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      return false;
    }
    // For other errors, let Cypress handle them normally
    return true;
  });

  describe("Long menu example", () => {
    beforeEach(() => {
      cy.visit(PageURL);
      // Ensure we're above mobile breakpoint
      cy.viewport(1000, 800);
      // Wait for the content to stabilize after initial load
      cy.get("#more-menu-story-button").should("be.visible");
    });

    it("should show the More button with overflow items", () => {
      // Check that the More button exists and is visible
      cy.get("#more-menu-story-button").should("be.visible");

      // Verify some items are in the main menu
      cy.get("#more-menu-story > li").should("be.visible");

      // Verify the More button has items (data attribute)
      cy.get("#more-menu-story-button").should(
        "have.attr",
        "data-has-items",
        "true",
      );

      // Verify the dropdown container is initially hidden
      cy.get("#more-menu-story-container").should("have.class", "hidden");
    });

    it("should open the menu when clicking the More button", () => {
      // Click the More button
      cy.get("#more-menu-story-button").click();

      // Verify the More button has aria-expanded = true
      cy.get("#more-menu-story-button").should(
        "have.attr",
        "aria-expanded",
        "true",
      );

      // Verify the dropdown container is visible
      cy.get("#more-menu-story-container").should("not.have.class", "hidden");

      // Verify the dropdown has items
      cy.get("#more-menu-story-container ul li").should("exist");
    });

    it("should close the menu when clicking the More button again", () => {
      // Open menu first
      cy.get("#more-menu-story-button").click();
      cy.get("#more-menu-story-container").should("not.have.class", "hidden");

      // Click the More button again
      cy.get("#more-menu-story-button").click();

      // Verify the More button has aria-expanded = false
      cy.get("#more-menu-story-button").should(
        "have.attr",
        "aria-expanded",
        "false",
      );

      // Verify the dropdown container is hidden
      cy.get("#more-menu-story-container").should("have.class", "hidden");
    });

    it("should respond to window resize by redistributing items", () => {
      // Capture initial visible items state
      cy.get('#more-menu-story > li[data-overflows="false"]').then(
        ($visibleItems) => {
          const initialCount = $visibleItems.length;

          // Resize to a wider viewport
          cy.viewport(1400, 800);

          // Wait for the resize to finish by checking for an attribute change
          cy.get('#more-menu-story > li[data-overflows="false"]', {
            timeout: 5000,
          }).should(($items) => {
            // Check that we have more visible items than before
            expect($items.length).to.be.at.least(initialCount);
          });

          // Now resize to a narrower viewport
          cy.viewport(800, 800);

          // Wait for the resize to finish and expect fewer visible items
          cy.get("#more-menu-story-button", { timeout: 5000 }).should(
            "have.attr",
            "data-has-items",
            "true",
          );

          cy.get('#more-menu-story > li[data-overflows="false"]').should(
            ($items) => {
              // We should have fewer items visible now
              expect($items.length).to.be.at.most(initialCount);
            },
          );
        },
      );
    });
  });

  describe("Shorter menu example", () => {
    beforeEach(() => {
      cy.visit(PageURL);
      // Just ensure the page is loaded without assuming button visibility
      cy.get("#more-menu-story-2").should("be.visible");
    });

    it("should hide 'More' button items when all fit in container", () => {
      // Set viewport wide enough for all items to fit
      cy.viewport(1400, 800);

      // Wait for the menu to initialize and verify More button is properly configured
      cy.get("#more-menu-story-2-button", { timeout: 5000 })
        .should("have.attr", "data-has-items", "false")
        .should("have.css", "display", "none");

      // Verify all items are in the main menu
      cy.get("#more-menu-story-2 > li").should(
        "have.attr",
        "data-overflows",
        "false",
      );
    });

    it("should show 'More' button items when container is too small", () => {
      // Start with a narrow viewport where items won't fit
      cy.viewport(800, 800);

      // Wait for attribute to change
      cy.get("#more-menu-story-2-button", { timeout: 5000 })
        .should("have.attr", "data-has-items", "true")
        .should("be.visible");

      // Verify some items overflow
      cy.get('#more-menu-story-2 > li[data-overflows="true"]').should("exist");

      // Click More button and verify overflow items in dropdown
      cy.get("#more-menu-story-2-button").click();
      cy.get("#more-menu-story-2-container").should("not.have.class", "hidden");
      cy.get("#more-menu-story-2-container ul li").should("exist");
    });

    it("should transition between states when resizing", () => {
      // Start with a wide viewport where all items fit
      cy.viewport(1400, 800);

      // Initially the More button should be hidden
      cy.get("#more-menu-story-2-button", { timeout: 5000 })
        .should("have.attr", "data-has-items", "false")
        .should("have.css", "display", "none");

      // Resize to a narrow viewport
      cy.viewport(800, 800);

      // The More button should appear
      cy.get("#more-menu-story-2-button", { timeout: 5000 })
        .should("have.attr", "data-has-items", "true")
        .should("be.visible");

      // Resize back to a wide viewport
      cy.viewport(1400, 800);

      // The More button should disappear again
      cy.get("#more-menu-story-2-button", { timeout: 5000 })
        .should("have.attr", "data-has-items", "false")
        .should("have.css", "display", "none");

      // Dropdown should be empty
      cy.get("#more-menu-story-2-container ul").should("be.empty");
    });
  });

  let PageURL = "/_storybook?component=more-menu";

  describe("Disclosure Menu components", () => {
    // Add handler for ResizeObserver errors
    Cypress.on("uncaught:exception", (err) => {
      // Return false to prevent Cypress from failing the test
      if (
        err.message.includes(
          "ResizeObserver loop completed with undelivered notifications",
        )
      ) {
        return false;
      }
      // For other errors, let Cypress handle them normally
      return true;
    });

    describe("Long menu example", () => {
      beforeEach(() => {
        cy.visit(PageURL);
        // Ensure we're above mobile breakpoint
        cy.viewport(1000, 800);
        // Wait for the content to stabilize after initial load
        cy.get("#more-menu-story-button").should("be.visible");
      });

      it("should show the More button with overflow items", () => {
        // Check that the More button exists and is visible
        cy.get("#more-menu-story-button").should("be.visible");

        // Verify some items are in the main menu
        cy.get("#more-menu-story > li").should("be.visible");

        // Verify the More button has items (data attribute)
        cy.get("#more-menu-story-button").should(
          "have.attr",
          "data-has-items",
          "true",
        );

        // Verify the dropdown container is initially hidden
        cy.get("#more-menu-story-container").should("have.class", "hidden");
      });

      it("should open the menu when clicking the More button", () => {
        // Click the More button
        cy.get("#more-menu-story-button").click();

        // Verify the More button has aria-expanded = true
        cy.get("#more-menu-story-button").should(
          "have.attr",
          "aria-expanded",
          "true",
        );

        // Verify the dropdown container is visible
        cy.get("#more-menu-story-container").should("not.have.class", "hidden");

        // Verify the dropdown has items
        cy.get("#more-menu-story-container ul li").should("exist");
      });

      it("should close the menu when clicking the More button again", () => {
        // Open menu first
        cy.get("#more-menu-story-button").click();
        cy.get("#more-menu-story-container").should("not.have.class", "hidden");

        // Click the More button again
        cy.get("#more-menu-story-button").click();

        // Verify the More button has aria-expanded = false
        cy.get("#more-menu-story-button").should(
          "have.attr",
          "aria-expanded",
          "false",
        );

        // Verify the dropdown container is hidden
        cy.get("#more-menu-story-container").should("have.class", "hidden");
      });

      it("should respond to window resize by redistributing items", () => {
        // Capture initial visible items state
        cy.get('#more-menu-story > li[data-overflows="false"]').then(
          ($visibleItems) => {
            const initialCount = $visibleItems.length;

            // Resize to a wider viewport
            cy.viewport(1400, 800);

            // Wait for the resize to finish by checking for an attribute change
            cy.get('#more-menu-story > li[data-overflows="false"]', {
              timeout: 5000,
            }).should(($items) => {
              // Check that we have more visible items than before
              expect($items.length).to.be.at.least(initialCount);
            });

            // Now resize to a narrower viewport
            cy.viewport(800, 800);

            // Wait for the resize to finish and expect fewer visible items
            cy.get("#more-menu-story-button", { timeout: 5000 }).should(
              "have.attr",
              "data-has-items",
              "true",
            );

            cy.get('#more-menu-story > li[data-overflows="false"]').should(
              ($items) => {
                // We should have fewer items visible now
                expect($items.length).to.be.at.most(initialCount);
              },
            );
          },
        );
      });
    });

    describe("Shorter menu example", () => {
      beforeEach(() => {
        cy.visit(PageURL);
        // Just ensure the page is loaded without assuming button visibility
        cy.get("#more-menu-story-2").should("be.visible");
      });

      it("should hide 'More' button items when all fit in container", () => {
        // Set viewport wide enough for all items to fit
        cy.viewport(1400, 800);

        // Wait for the menu to initialize and verify More button is properly configured
        cy.get("#more-menu-story-2-button", { timeout: 5000 })
          .should("have.attr", "data-has-items", "false")
          .should("have.css", "display", "none");

        // Verify all items are in the main menu
        cy.get("#more-menu-story-2 > li").should(
          "have.attr",
          "data-overflows",
          "false",
        );
      });

      it("should show 'More' button items when container is too small", () => {
        // Start with a narrow viewport where items won't fit
        cy.viewport(800, 800);

        // Wait for attribute to change
        cy.get("#more-menu-story-2-button", { timeout: 5000 })
          .should("have.attr", "data-has-items", "true")
          .should("be.visible");

        // Verify some items overflow
        cy.get('#more-menu-story-2 > li[data-overflows="true"]').should(
          "exist",
        );

        // Click More button and verify overflow items in dropdown
        cy.get("#more-menu-story-2-button").click();
        cy.get("#more-menu-story-2-container").should(
          "not.have.class",
          "hidden",
        );
        cy.get("#more-menu-story-2-container ul li").should("exist");
      });

      it("should transition between states when resizing", () => {
        // Start with a wide viewport where all items fit
        cy.viewport(1400, 800);

        // Initially the More button should be hidden
        cy.get("#more-menu-story-2-button", { timeout: 5000 })
          .should("have.attr", "data-has-items", "false")
          .should("have.css", "display", "none");

        // Resize to a narrow viewport
        cy.viewport(800, 800);

        // The More button should appear
        cy.get("#more-menu-story-2-button", { timeout: 5000 })
          .should("have.attr", "data-has-items", "true")
          .should("be.visible");

        // Resize back to a wide viewport
        cy.viewport(1400, 800);

        // The More button should disappear again
        cy.get("#more-menu-story-2-button", { timeout: 5000 })
          .should("have.attr", "data-has-items", "false")
          .should("have.css", "display", "none");

        // Dropdown should be empty
        cy.get("#more-menu-story-2-container ul").should("be.empty");
      });
    });

    describe("Accessibility and keyboard navigation for More menu", () => {
      beforeEach(() => {
        cy.visit(PageURL);
        cy.viewport(1000, 800);
        cy.get("#more-menu-story-button").should("be.visible");
        cy.get("#more-menu-story-button").click();
        cy.get("#more-menu-story-container").should("not.have.class", "hidden");
      });

      it("focuses the first menu item when expanded", () => {
        cy.get("#more-menu-story-container ul li")
          .first()
          .find("a")
          .should("have.focus");
      });

      it("navigates menu items with arrow keys and wraps focus", () => {
        cy.get("#more-menu-story-container ul li").as("menuItems");
        cy.get("@menuItems").first().find("a").should("have.focus");

        // Arrow down to next item
        cy.focused().type("{downArrow}");
        cy.get("@menuItems").eq(1).find("a").should("have.focus");

        // Arrow down to last item
        cy.get("@menuItems").then(($items) => {
          const lastIndex = $items.length - 1;
          cy.log("Last index:", lastIndex);
          // cy.pause();
          for (let i = 1; i < lastIndex; i++) {
            cy.focused().type("{downArrow}");
          }
          cy.get("@menuItems").eq(lastIndex).find("a").should("have.focus");

          // Arrow down again should wrap to first
          cy.focused().type("{downArrow}");
          cy.get("@menuItems").first().find("a").should("have.focus");
        });

        // Arrow up from first should wrap to last
        cy.focused().type("{upArrow}");
        cy.get("@menuItems").last().find("a").should("have.focus");
      });

      it.only("closes menu and returns focus to button on Esc", () => {
        cy.get("#more-menu-story-container ul li").as("menuItems");
        cy.get("@menuItems").first().find("a").should("have.focus");
        // cy.pause()
        cy.focused().type("{esc}");
        cy.focused().should("match", "#more-menu-story-button");
      });

      it("More button has aria-label", () => {
        cy.get("#more-menu-story-button")
          .should("have.attr", "aria-label")
          .and("not.be.empty");
      });
    });
  });
});
