import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Language block nesting behavior", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
    RichTextEditor.Components.Editor().should("exist");

    // Clear editor
    RichTextEditor.Components.Editor()
      .should("contain.text", "Welcome to the Editor")
      .click("topLeft")
      .type("{selectall}{del}{del}");

    RichTextEditor.Components.Editor()
      .should("not.contain.text", "Welcome to the Editor")
      .and("have.text", "");
  });

  it("prevents nesting FR inside EN (visual editor)", () => {
    // Insert English block
    RichTextEditor.Components.EnglishBlockButton().click();

    // Ensure one English block present
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .should("have.length", 1);

    // Attempt to insert French block while caret is inside the English block
    RichTextEditor.Components.FrenchBlockButton().click();

    // French block should not be nested inside English block
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"] div[lang="fr-CA"]')
      .should("have.length", 0);

    // There should be no French blocks at all (insertion prevented)
    RichTextEditor.Components.Editor()
      .find('div[lang="fr-CA"]')
      .should("have.length", 0);
  });

  it("allows block conditional inside a language block", () => {
    RichTextEditor.Components.EnglishBlockButton().click();

    // Insert block conditional while inside the language block
    RichTextEditor.Components.ConditionalBlockButton().click();

    // The conditional should be inside the language block
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .find('div[data-type="conditional"]')
      .should("have.length", 1);
  });

  it("allows blockquote inside a language block", () => {
    RichTextEditor.Components.EnglishBlockButton().click();

    // Insert blockquote while inside the language block
    RichTextEditor.Components.BlockquoteButton().click();

    // The blockquote should be inside the language block
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .find("blockquote")
      .should("have.length", 1);
  });

  it("ignores inner language markers typed in markdown when switching to visual editor", () => {
    // Switch to markdown view
    RichTextEditor.Components.ViewMarkdownButton().click();

    const nestedMarkdown = `[[en]]\nOuter line\n[[fr]]\nInner line\n[[/fr]]\nOuter after\n[[/en]]`;

    // Type the markdown directly into the markdown editor
    RichTextEditor.Components.MarkdownEditor()
      .clear()
      .type(nestedMarkdown, { delay: 0 });

    // Switch back to visual editor
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Only the outer EN block should be rendered; inner FR ignored
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .should("have.length", 1);
    RichTextEditor.Components.Editor()
      .find('div[lang="fr-CA"]')
      .should("have.length", 0);
  });
});
