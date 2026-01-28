import RichTextEditor, {
  FORMATTING_OPTIONS,
} from "../../../../Notify/Admin/Components/RichTextEditor";

const modKey = Cypress.platform === "darwin" ? "Meta" : "Control";

describe("Toolbar accessibility tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().realPress([modKey, "A"]);
    RichTextEditor.Components.Editor().type("{selectall}{del}");
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

  context("Toolbar buttons have tooltips", () => {
    Object.entries(FORMATTING_OPTIONS).forEach(([key, testId]) => {
      it(humanize(key), () => {
        const button = cy.getByTestId(testId);
        button.trigger("mouseover");
        cy.get(".rte-tooltip-box").should("exist");
        cy.get(".rte-tooltip-label").should("not.be.empty");
        RichTextEditor.Components.Editor().focus();
        button.trigger("mouseleave");
        button.trigger("blur");
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

      cy.realPress(["Alt", "F10"]);

      // Verify the toolbar is focused
      RichTextEditor.Components.H1Button().should("have.focus");
    });

    it("Toolbar buttons can be accessed via arrow keys", () => {
      // Focus the editor first
      RichTextEditor.Components.Editor().focus();

      cy.realPress(["Alt", "F10"]);

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
      cy.realPress(["Alt", "F10"]);
      RichTextEditor.Components.H1Button().should("have.focus");
      // Navigate to variable button
      cy.get("body").type("{rightarrow}{rightarrow}");

      RichTextEditor.Components.Editor().focus();
      cy.realPress(["Alt", "F10"]);
      RichTextEditor.Components.HorizontalRuleButton().should("have.focus");
    });
  });

  context("Toolbar formatting shortcuts", () => {
    const shortcutSpecs = [
      {
        label: "Heading",
        modifiers: [modKey, "Alt"],
        key: "1",
        button: () => RichTextEditor.Components.H1Button(),
      },
      {
        label: "Subheading",
        modifiers: [modKey, "Alt"],
        key: "2",
        button: () => RichTextEditor.Components.H2Button(),
      },
      {
        label: "Variable",
        modifiers: [modKey, "Shift"],
        key: "U",
        button: () => RichTextEditor.Components.VariableButton(),
      },
      {
        label: "Bullet list",
        modifiers: [modKey, "Shift"],
        key: "8",
        button: () => RichTextEditor.Components.BulletListButton(),
      },
      {
        label: "Numbered list",
        modifiers: [modKey, "Shift"],
        key: "7",
        button: () => RichTextEditor.Components.NumberedListButton(),
      },
      {
        label: "Blockquote",
        modifiers: [modKey, "Shift"],
        key: "9",
        button: () => RichTextEditor.Components.BlockquoteButton(),
      },
      {
        label: "RTL block",
        modifiers: [modKey, "Alt"],
        key: "R",
        button: () => RichTextEditor.Components.RTLButton(),
      },
      {
        label: "Bold",
        modifiers: [modKey],
        key: "b",
        button: () => RichTextEditor.Components.BoldButton(),
      },
      {
        label: "Italic",
        modifiers: [modKey],
        key: "i",
        button: () => RichTextEditor.Components.ItalicButton(),
      },
    ];

    shortcutSpecs.forEach(({ label, modifiers, key, button }) => {
      it(`${label} toggles via shortcut`, () => {
        RichTextEditor.Components.Editor()
          .focus()
          .type("Shortcut test{selectall}");
        cy.realPress([...modifiers, key]);
        button().should("have.attr", "aria-pressed", "true");

        RichTextEditor.Components.Editor().focus().type("{selectall}");
        cy.log("pressing:" + [...modifiers, key].toString());
        cy.realPress([...modifiers, key]);
        button().should("have.attr", "aria-pressed", "false");
      });
    });

    it("opens the link modal via Mod+K", () => {
      RichTextEditor.Components.Editor()
        .focus()
        .type("Link shortcut{selectall}");
      cy.realPress([modKey, "k"]);
      RichTextEditor.Components.LinkModal.Modal()
        .should("exist")
        .and("be.visible");
      cy.realPress("Escape");
      RichTextEditor.Components.LinkModal.Modal().should("not.exist");
    });
  });
});
