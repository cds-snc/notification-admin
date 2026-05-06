import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

/**
 * Simplified markdown with one block/mark type per line so each type can be
 * reached directly without navigating past unrelated content.
 */
const MARKDOWN_CONTENT = `# Heading 1

## Heading 2

---

**bold**

*italics*

[link](https://link)

- bullet 1
- bullet 2

1. number 1
2. number 2

^ quoted text

((variable))

((variable??conditional text))

((variable??
conditional section

))

[[en]]
English block
[[/en]]

[[fr]]
French block
[[/fr]]

[[rtl]]
RTL TEXT
[[/rtl]]`;

describe("Live region announces context as user navigates the editor", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor()
      .clear()
      .type(MARKDOWN_CONTENT, { delay: 0 });
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor().should("exist").and("be.visible");
  });

  it("announces Heading when cursor enters heading 1", () => {
    RichTextEditor.Components.Editor().click("topLeft");
    cy.realPress(["Control", "Home"]);
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Heading",
    );
  });

  it("announces Subheading when arrowing down from heading 1 into heading 2", () => {
    RichTextEditor.Components.Editor().find("h1").click();
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Subheading",
    );
  });

  it("announces Section break when arrowing down from heading 2 onto the horizontal rule", () => {
    RichTextEditor.Components.Editor().find("h2").click();
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Section break",
    );
  });

  it("announces Bulleted list when cursor is inside a bullet list item", () => {
    RichTextEditor.Components.Editor().find("ul li").first().click();
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Bulleted List",
    );
  });

  it("announces Numbered List when cursor is inside a numbered list item", () => {
    RichTextEditor.Components.Editor().find("ol li").first().click();
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Numbered List",
    );
  });

  it("announces Blockquote when arrowing into a blockquote", () => {
    RichTextEditor.Components.Editor().find("ol li").last().click();
    cy.realPress("End");
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Blockquote",
    );
  });

  it("announces English content when arrowing into an English block", () => {
    RichTextEditor.Components.Editor()
      .find('[data-type="conditional"] .conditional-content p')
      .first()
      .click();
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "English content",
    );
  });

  it("announces French content when arrowing into a French block", () => {
    RichTextEditor.Components.Editor().find('[lang="fr-CA"]').prev().click();
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "French content",
    );
  });

  it("announces Right-to-left text when arrowing into an RTL block", () => {
    RichTextEditor.Components.Editor().find('[lang="fr-CA"] p').first().click();
    cy.realPress("ArrowDown");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Right-to-left text",
    );
  });

  it("announces Conditional when cursor is inside a conditional block", () => {
    RichTextEditor.Components.Editor()
      .find('[data-type="conditional"] .conditional-content p')
      .first()
      .click();
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Conditional",
    );
  });

  it("announces Bold when cursor is in bold text", () => {
    RichTextEditor.Components.Editor()
      .find("strong")
      .first()
      .closest("p")
      .click("left");
    cy.realPress("End");
    RichTextEditor.Components.EditorAnnouncer().should("contain.text", "Bold");
  });

  it("announces Italic when cursor is in italic text", () => {
    RichTextEditor.Components.Editor()
      .find("em")
      .first()
      .closest("p")
      .click("left");
    cy.realPress("End");
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Italic",
    );
  });

  // TODO: put this back in when we fix #3111
  it("announces Link when cursor is in a link", () => {
    RichTextEditor.Components.Editor()
      .find("a")
      .first()
      .click();
    RichTextEditor.Components.Editor().realPress("ArrowLeft");
    RichTextEditor.Components.EditorAnnouncer().should("contain.text", "Link");
  });

  it("announces Variable when cursor is inside a variable mark", () => {
    // The variable mark has inclusive:false, so marks() only returns it when
    // textOffset > 0 (cursor strictly inside, not at a boundary).
    // realClick() fires native OS-level mouse events so the browser resolves
    // the cursor to the centre of the span text (~textOffset 4), triggering
    // ProseMirror's selectionchange → selectionSet transaction → announcer.
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .first()
      .realClick();
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Variable",
    );
  });

  it("announces Conditional text when cursor is inside a conditional inline", () => {
    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"] .conditional-inline-content')
      .first()
      .click();
    RichTextEditor.Components.EditorAnnouncer().should(
      "contain.text",
      "Conditional text",
    );
  });
});
