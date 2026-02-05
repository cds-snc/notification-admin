import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Conditional inline and block tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().type("{selectall}{del}");

    // ensure editor has no text
    RichTextEditor.Components.Editor().should("have.text", "");
  });

  context("Inline keyboard navigation", () => {
    beforeEach(() => {
      // Insert an inline conditional using correct syntax: ((var??content))
      RichTextEditor.Components.Editor().type("((v??c))");
    });

    it("Focus exits input to the right when arrowing right inside conditional input", () => {
      // Find the conditional input and focus it
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .first()
        .focus()
        .type("jhasd{end}{rightarrow}");

      // Focus should move away from the input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .first()
        .should("not.have.focus");
    });

    it("Focus enters the input on the left when arrowing right from outside conditional", () => {
      // Create content before the conditional
      RichTextEditor.Components.Editor().clear().type("text ((v??c))");

      // Position cursor before the conditional (after "text "), press cmd+up
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");

      // Arrow right should enter the conditional input (from the left)
      cy.realPress("ArrowRight");

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .should("have.focus");
    });

    it("Focus exits input to the left when arrowing left from inside conditional input", () => {
      // Create content before the conditional
      RichTextEditor.Components.Editor().clear().type("text ((v??c))");

      // Focus the conditional input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .first()
        .focus();

      // Move cursor to start of input
      cy.realPress("Home");

      // Arrow left should exit the conditional input
      cy.realPress("ArrowLeft");

      // Focus should move away from the input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .first()
        .should("not.have.focus");
    });

    it("Focus enters the input on the right when arrowing left from outside conditional", () => {
      // Create content after the conditional
      RichTextEditor.Components.Editor().clear().type("((cond??x)) y");

      // Arrow left should enter the conditional input (from the right)
      RichTextEditor.Components.Editor().type(
        "{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}",
      ); // two left arrows to get into input

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .should("have.focus");
    });

    it("When focus is on conditional input, Pressing Tab sets focus on the conditional body", () => {
      // Focus the conditional input
      cy.realPress("ArrowLeft");
      // press Tab
      cy.realType("Tab");

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find("span.conditional-inline-content")
        .first()
        .then(($inner) => {
          cy.window().then((win) => {
            const selection = win.getSelection();
            const range = selection.getRangeAt(0);
            const isInside = $inner[0].contains(range.commonAncestorContainer);
            expect(isInside).to.be.true;
          });
        });
    });

    it("When focus is on conditional body, Pressing Shift+Tab sets focus on the conditional input", () => {
      // Focus the conditional body
      cy.realPress(["Shift", "Tab"]);

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"] .conditional-inline-condition-input')
        .first()
        .should("have.focus");
    });

    it("Pressing enter inside a conditional inline turns it into a conditional block", () => {
      cy.focused().type("{end}{enter}");

      // The inline conditional should now be converted to a block conditional
      RichTextEditor.Components.Editor()
        .find('div[data-type="conditional"]')
        .should("exist");

      // The inline conditional should no longer exist
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("not.exist");
    });
  });

  context("Block keyboard navigation", () => {
    beforeEach(() => {
      // Insert a block conditional using correct syntax: ((var??
      // content))
      RichTextEditor.Components.Editor().type("((v??\nc\n))");
    });

    it("Focus exits input to the right when arrowing right inside conditional input", () => {
      // Find the conditional input and focus it
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .first()
        .focus();

      // Move cursor to end of input
      cy.focused().type("{end}");

      // Press right arrow to exit the conditional
      cy.realPress("ArrowRight");

      // Focus should move away from the input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .first()
        .should("not.have.focus");
    });

    it("Focus enters the input on the left when arrowing right from outside conditional", () => {
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");

      // Arrow right should enter the conditional input (from the left)
      cy.realPress("ArrowRight");

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .should("have.focus");
    });

    it("Focus exits input to the left when arrowing left from inside conditional input", () => {
      // 4x Arrow left should exit the conditional input
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");

      // Focus should move away from the input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .first()
        .should("not.have.focus");
    });

    it("Focus enters the input on the right when arrowing left from outside conditional", () => {
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .should("not.have.focus");
      // 2x Arrow left should enter the conditional input (from the right)
      cy.realPress("ArrowLeft");
      cy.realPress("ArrowLeft");

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .should("have.focus");
    });

    it("When focus is on conditional input, Pressing Tab sets focus on the conditional body", () => {
      // Focus the conditional input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .first()
        .focus();

      // Press Tab to move to the conditional body
      cy.realPress("Tab");

      // The conditional body (contenteditable area inside) should have focus
      RichTextEditor.Components.Editor()
        .find("div.conditional-content")
        .first()
        .then(($inner) => {
          cy.window().then((win) => {
            const selection = win.getSelection();
            const range = selection.getRangeAt(0);
            const isInside = $inner[0].contains(range.commonAncestorContainer);
            expect(isInside).to.be.true;
          });
        });
    });

    it("When focus is on conditional body, Pressing Shift+Tab sets focus on the conditional input", () => {
      // Press Shift+Tab to move back to the input
      cy.realPress(["Shift", "Tab"]);

      // The conditional input should now have focus
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .first()
        .should("have.focus");
    });
  });

  context("Initial focus", () => {
    it("Typing inline conditional: focus should be at the end of the conditional content", () => {
      // Type an inline conditional
      RichTextEditor.Components.Editor().type("((var??content))");

      // Focus should be in the conditional body (at the end of content)
      RichTextEditor.Components.Editor()
        .find("span.conditional-inline-content")
        .first()
        .then(($inner) => {
          cy.window().then((win) => {
            const selection = win.getSelection();
            const range = selection.getRangeAt(0);
            const isInside = $inner[0].contains(range.commonAncestorContainer);
            expect(isInside).to.be.true;
          });
        });
    });

    it("Typing block conditional: focus should be at the end of the conditional content", () => {
      // Type a block conditional
      RichTextEditor.Components.Editor().type("((var??\ncontent\n))");

      // Focus should be in the conditional body (at the end of content)
      RichTextEditor.Components.Editor()
        .find("div.conditional-content")
        .first()
        .then(($inner) => {
          cy.window().then((win) => {
            const selection = win.getSelection();
            const range = selection.getRangeAt(0);
            const isInside = $inner[0].contains(range.commonAncestorContainer);
            expect(isInside).to.be.true;
          });
        });
    });

    it("Using toolbar, inline conditional: focus should be on condition input", () => {
      // Create some content to select
      RichTextEditor.Components.Editor().type("test");
      cy.realPress("Home"); // go to start
      cy.realPress(["Shift", "End"]); // select to end
      // cy.pause();
      // Click the inline conditional button
      RichTextEditor.Components.ConditionalInlineButton().click();

      // Focus should be on the condition input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"] .conditional-inline-condition-input')
        .should("have.focus");
    });

    it("Using toolbar, block conditional: focus should be on condition input", () => {
      // Create some content to select
      RichTextEditor.Components.Editor().type("test");
      cy.realPress("Home"); // go to start
      cy.realPress(["Shift", "End"]); // select to end

      // Click the block conditional button
      RichTextEditor.Components.ConditionalBlockButton().click();

      // Focus should be on the condition input
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional"] input')
        .should("have.focus");
    });
  });

  context("Syntax checks", () => {
    it("Inline conditional rendered when typing `((var??content))`", () => {
      // Type an inline conditional
      RichTextEditor.Components.Editor().type("((var??content))");

      // There should be an inline conditional element
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("exist");
    });
    it("Inline conditional not rendered when typing `((var??))`", () => {
      // Type an inline conditional with no content
      RichTextEditor.Components.Editor().type("((var??))");

      // There should be no inline conditional element
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("not.exist");
    });
    it("Inline conditional not rendered when typing `((??content))`", () => {
      // Type an inline conditional with no content
      RichTextEditor.Components.Editor().type("((??content))");

      // There should be no inline conditional element
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("not.exist");
    });
    it("Block conditional rendered when typing `((var??\ncontent))`", () => {
      // Type an inline conditional
      RichTextEditor.Components.Editor().type("((var??\ncontent))");

      // There should be an inline conditional element
      RichTextEditor.Components.Editor()
        .find('div[data-type="conditional"]')
        .should("exist");
    });
    it("Block conditional rendered when typing `((var??\ncontent\n))`", () => {
      // Type an inline conditional
      RichTextEditor.Components.Editor().type("((var??\ncontent\n))");

      // There should be an inline conditional element
      RichTextEditor.Components.Editor()
        .find('div[data-type="conditional"]')
        .should("exist");
    });
  });
});
