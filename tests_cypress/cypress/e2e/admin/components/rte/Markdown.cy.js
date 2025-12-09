import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
import { humanize } from "../../../../support/utils";
import MARKDOWN from "../../../../fixtures/markdownSamples.js";

describe("Markdown entering and pasting tests", () => {
  beforeEach(() => {
    // Load the editor
    cy.visit(RichTextEditor.URL);

    // Ensure toolbar is ready for interactions
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Ensure editor is mounted and ready
    RichTextEditor.Components.Editor().should("exist");

    // Wait for initial default content, then clear robustly
    RichTextEditor.Components.Editor()
      .should("contain.text", "Welcome to the Editor")
      .click("topLeft")
      .type("{selectall}{del}{del}");

    // Assert default content is gone and editor is empty
    RichTextEditor.Components.Editor()
      .should("not.contain.text", "Welcome to the Editor")
      .and("have.text", "");
  });

  Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
    it(`Correctly renders markdown for ${humanize(key)}`, () => {
      RichTextEditor.Components.Editor().type(before);

      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);

      // switch back to editor view and ensure no data loss
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("not.exist");

      // switch back to markdown and ensure content is still correct
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
    });
  });

  it("Variables are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.VARIABLES.before);

    // Editor should have 9 marked up variables
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 9);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.VARIABLES.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should have 9 marked up variables
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 9);
  });

  it("Links are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.LINKS.before);

    // Editor should have 9 marked up links
    RichTextEditor.Components.Editor().find("a").should("have.length", 9);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.LINKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should have 9 marked up links
    RichTextEditor.Components.Editor().find("a").should("have.length", 9);
  });

  it.only("Renders initial markdown samples correctly after converting to markdown", () => {
    // Visit the Storybook page for the text editor
    cy.visit("http://localhost:6012/_storybook?component=text-editor-tiptap-complex-markdown");

    // Ensure the editor is loaded
    RichTextEditor.Components.Editor().should("exist");

    // Switch to markdown mode
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Concatenate all expected values from markdownSamples
    const concatenatedExpected = Object.values(MARKDOWN)
      .map(({ expected }) => expected)
      .join("\n\n");

    // Assert that the editor's content matches the concatenated expected values
    RichTextEditor.Components.MarkdownEditor().should("have.text", concatenatedExpected);
  });
});
