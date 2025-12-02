import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

import { humanize } from "../../../../support/utils";

import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe.only("Markdown entering and pasting tests", () => {
  beforeEach(() => {
    // Load the editor with explicit timeout and error handling
    cy.visit(RichTextEditor.URL, { timeout: 10000 });
    
    // Wait for page to be fully loaded and interactive
    cy.window().should('exist');
    cy.document().should('exist');
    
    // Ensure toolbar is ready for interactions
    RichTextEditor.Components.Toolbar().should("exist", { timeout: 10000 }).and("be.visible");
    
    // Ensure editor is mounted and ready
    RichTextEditor.Components.Editor().should("exist", { timeout: 10000 });

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().realPress(["Meta", "A"]);
    RichTextEditor.Components.Editor().type("{selectall}{del}");

    // ensure editor has no text
    RichTextEditor.Components.Editor().should("have.text", "");
    
    // Brief wait to ensure clearing is complete and no async re-population occurs
    cy.wait(100);
  });

  Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
    it(`Correctly renders markdown for ${humanize(key)}`, () => {
      // Ensure editor is ready and empty before each test iteration
      RichTextEditor.Components.Editor().should("have.text", "");
      RichTextEditor.Components.Editor().focus();

      // enter markdown (slower typing for CI stability)
      cy.realType(before, { delay: 10, pressDelay: 0 });

      RichTextEditor.Components.ViewMarkdownButton().click();
      // ensure markdown matches expected
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);

      // pasting
      RichTextEditor.Components.MarkdownEditor().type("{selectall}{del}");
      RichTextEditor.Components.MarkdownEditor().should("have.text", "");
      RichTextEditor.Components.MarkdownEditor().paste(expected);

      // ensure markdown is correct
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
      // switch back to editor view and ensure no data loss
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("not.exist");

      // switch back to markdown and ensure content is still correct
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
    });
  });
});
