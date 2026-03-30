import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Callout block behavior", () => {
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

  it("prevents nesting callout inside callout", () => {
    RichTextEditor.Components.CalloutBlockButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"]')
      .should("have.length", 1);

    RichTextEditor.Components.CalloutBlockButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"] div[data-type="callout-block"]')
      .should("have.length", 0);
  });

  it("allows CTA link inside callout", () => {
    RichTextEditor.Components.CalloutBlockButton().click();

    RichTextEditor.Components.Editor().type("apply now{selectall}");
    RichTextEditor.Components.LinkButton().click();
    RichTextEditor.Components.LinkModal.URLInput().type("https://example.com");
    RichTextEditor.Components.LinkModal.CTACheckbox().check();
    RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"]')
      .find('a[data-cta="true"]')
      .should("have.length", 1);
  });

  it("prevents inserting EN/FR inside callout", () => {
    RichTextEditor.Components.CalloutBlockButton().click();

    RichTextEditor.Components.EnglishBlockButton().click();
    RichTextEditor.Components.FrenchBlockButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"] div[lang="en-CA"]')
      .should("have.length", 0);

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"] div[lang="fr-CA"]')
      .should("have.length", 0);
  });

  it("ignores nested callout markers typed in markdown when switching to visual editor", () => {
    RichTextEditor.Components.ViewMarkdownButton().click();

    const nestedMarkdown = `[[callout]]\nOuter line\n[[callout]]\nInner line\n[[/callout]]\nOuter after\n[[/callout]]`;

    RichTextEditor.Components.MarkdownEditor()
      .clear()
      .type(nestedMarkdown, { delay: 0 });

    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"]')
      .should("have.length", 1);

    RichTextEditor.Components.Editor()
      .find('div[data-type="callout-block"] div[data-type="callout-block"]')
      .should("have.length", 0);
  });
});
