import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

import { humanize } from "../../../../support/utils";

import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe("Markdown entering and pasting tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Wait for the editor to be fully initialized with its default content
    // Check that it contains the expected storybook default text
    RichTextEditor.Components.Editor().should("contain.text", "Welcome to the Editor");
    
    // Now clear it - the editor should be stable at this point
    RichTextEditor.Components.Editor().focus().realPress(["Meta", "A"]);
    RichTextEditor.Components.Editor().realPress("Backspace");
    
    // Verify it's empty and stays empty
    RichTextEditor.Components.Editor().should("have.text", "");
  });

  Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
    it(`Correctly renders markdown for ${humanize(key)}`, () => {
      // Ensure editor is ready and empty before each test iteration
      RichTextEditor.Components.Editor().should("have.text", "");
      RichTextEditor.Components.Editor().focus();

      // enter markdown
      cy.realType(before, { delay: 1, pressDelay: 0 });

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
