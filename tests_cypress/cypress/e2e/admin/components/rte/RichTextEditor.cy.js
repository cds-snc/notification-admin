import RichTextEditor, {
  FORMATTING_OPTIONS,
} from "../../../../Notify/Admin/Components/RichTextEditor";

// Helper: reliably simulate Alt+F10 using native keyboard events
const pressAltF10 = () => {
  const keyEvent = {
    key: "F10",
    code: "F10",
    keyCode: 121,
    which: 121,
    altKey: true,
    bubbles: true,
  };
  // focus and trigger keydown/keypress/keyup in sequence on the body
  return cy
    .get("body")
    .focus()
    .trigger("keydown", keyEvent)
    .trigger("keypress", keyEvent)
    .trigger("keyup", keyEvent);
};

describe("Toolbar accessibility tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().focus().type("{selectall}{del}");
  });

  const humanize = (key) =>
    key
      .toLowerCase()
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  /**
   * Toolbar button accessibility and label tests
   *
   * For each formatting button we check:
   *  - initial label contains "Apply"
   *  - aria-pressed toggles from false -> true -> false
   *  - label updates to contain "Remove" after applying
   *  - live region contains an "applied" message after apply
   *  - label reverts to "Apply" after removal and live region contains "removed"
   */
  context("Toolbar buttons update text, labels, aria-live when invoked", () => {
    Object.entries(FORMATTING_OPTIONS).forEach(([key, testId]) => {
      it(humanize(key), () => {
        const button = cy.getByTestId(testId);

        // 1) check initial label and aria state
        button.should(($b) => {
          const text = $b.text().trim();
          expect(
            text,
            `Label for ${humanize(key)} should contain "apply"`,
          ).to.match(/Apply/i);
        });
        button.should("have.attr", "aria-pressed", "false");

        // 2) type content and select it to make formatting apply-able
        RichTextEditor.Components.Editor().focus().type("{selectall}{del}");
        RichTextEditor.Components.Editor()
          .focus()
          .type("Button test: " + testId);
        RichTextEditor.Components.Editor().focus().type("{selectall}");

        // 3) apply formatting
        button.click();

        // label should update and aria-pressed should be true
        button.should(($b) => {
          const text = $b.text().trim();
          expect(
            text,
            `Label for ${humanize(key)} should contain "remove"`,
          ).to.match(/Remove/i);
        });
        button.should("have.attr", "aria-pressed", "true");

        // live region should announce the applied state; log its text for debugging
        RichTextEditor.Components.LiveRegion().should(
          "contain.text",
          `applied`,
        );

        // 4) remove formatting and verify revert
        RichTextEditor.Components.Editor().focus().type("{selectall}");
        button.click();

        button.should(($b) => {
          const text = $b.text().trim();
          expect(
            text,
            `Label for ${humanize(key)} should contain "apply"`,
          ).to.match(/Apply/i);
        });
        button.should("have.attr", "aria-pressed", "false");
        RichTextEditor.Components.LiveRegion().should(
          "contain.text",
          `removed`,
        );
      });
    });
  });

  it("Toolbar has appropriate role and aria attributes", () => {
    RichTextEditor.Components.Toolbar().should("have.attr", "role", "toolbar");
    RichTextEditor.Components.Toolbar()
      .should("have.attr", "aria-label")
      .and("not.be.empty");
    RichTextEditor.Components.Toolbar().should(
      "have.attr",
      "aria-keyshortcuts",
      "Alt+F10",
    );
    RichTextEditor.Components.Toolbar().should(
      "have.attr",
      "aria-orientation",
      "horizontal",
    );
  });

  context("Toolbar keyboard shortcut", () => {
    it("Toolbar can be focused via keyboard shortcut", () => {
      // Focus the editor first
      RichTextEditor.Components.Editor().focus();

      // Press Alt+F10 to focus the toolbar using helper
      pressAltF10();

      // Verify the toolbar is focused
      RichTextEditor.Components.H1Button().should("have.focus");
    });

    it("Toolbar buttons can be accessed via arrow keys", () => {
      // Focus the editor first
      RichTextEditor.Components.Editor().focus();

      // Press Alt+F10 to focus the toolbar using helper
      pressAltF10();

      // Forward navigation: ensure pressing Right Arrow moves focus to next button
      Object.entries(FORMATTING_OPTIONS).forEach(([key, testId], index) => {
        // get the next button by position (index + 1)
        RichTextEditor.Components.Toolbar()
          .find("button")
          .eq(index + 1)
          .as("nextBtn");

        // use it:
        cy.get("body").type("{rightarrow}");
        cy.get("@nextBtn").should("have.focus");
      });

      // Backward navigation: for each toolbar button (from last to second)
      // focus it, press Left Arrow and expect focus to move to the previous button.
      const keys = Object.keys(FORMATTING_OPTIONS);
      const total = keys.length;
      for (let i = total - 1; i > 0; i--) {
        RichTextEditor.Components.Toolbar().find("button").eq(i).focus();

        // send Left Arrow to move focus backward
        cy.get("body").type("{leftarrow}");

        // assert the previous button has focus
        RichTextEditor.Components.Toolbar()
          .find("button")
          .eq(i - 1)
          .should("have.focus");
      }
    });

    it("Toolbar remembers focus state", () => {
      RichTextEditor.Components.Editor().focus();

      // access toolbar
      pressAltF10();
      RichTextEditor.Components.H1Button().should("have.focus");
      // Navigate to variable button
      cy.get("body").type("{rightarrow}{rightarrow}");

      RichTextEditor.Components.Editor().focus();
      pressAltF10();
      RichTextEditor.Components.VariableButton().should("have.focus");
    });
  });
});

describe("Editor accessibility tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  it("Editor has appropriate role and aria-label", () => {
    RichTextEditor.Components.Editor().should("have.attr", "role", "textbox");
    RichTextEditor.Components.Editor().should("have.attr", "aria-labelledby");
    RichTextEditor.Components.Editor().should("have.attr", "aria-multiline");
    RichTextEditor.Components.Editor().should("not.be.empty");
  });
});
