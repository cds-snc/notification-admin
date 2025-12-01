import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

import { humanize } from "../../../../support/utils";

import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe("Markdown entering and pasting tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().realPress(["Meta", "A"]);
    RichTextEditor.Components.Editor().type("{selectall}{del}");

    // ensure editor has no text
    RichTextEditor.Components.Editor().should("have.text", "");
  });

  Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
    it(`Correctly renders markdown for ${humanize(key)}`, () => {
      RichTextEditor.Components.Editor().focus();

      // enter markdown
      cy.realType(before, { delay: 1, pressDelay: 0 });

      RichTextEditor.Components.ViewMarkdownButton().click();
      // small stabilization pause to avoid reading the textarea mid-update in CI
      cy.wait(150);
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
      cy.wait(150);
        RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
    });
  });
});
