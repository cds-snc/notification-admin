import RichTextEditor, {
  FORMATTING_OPTIONS,
} from "../../../../Notify/Admin/Components/RichTextEditor";

// Buttons that must not exist in the restricted SMS toolbar - SMS only
// supports variables and conditional text/sections.
const UNSUPPORTED_BUTTON_KEYS = [
  "HEADING_1",
  "HEADING_2",
  "BOLD",
  "ITALIC",
  "BULLET_LIST",
  "NUMBERED_LIST",
  "BLOCKQUOTE",
  "ENGLISH_BLOCK",
  "FRENCH_BLOCK",
  "RTL",
];

describe("SMS toolbar restrictions", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL_SMS);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  it("only shows the variable and conditional buttons", () => {
    UNSUPPORTED_BUTTON_KEYS.forEach((key) => {
      cy.getByTestId(FORMATTING_OPTIONS[key].testId).should("not.exist");
    });

    cy.getByTestId(FORMATTING_OPTIONS.VARIABLE.testId).should("exist");
    cy.getByTestId(FORMATTING_OPTIONS.CONDITIONAL_INLINE.testId).should(
      "exist",
    );
    cy.getByTestId(FORMATTING_OPTIONS.CONDITIONAL_BLOCK.testId).should("exist");
  });

  it("keeps the markdown-source toggle available", () => {
    RichTextEditor.Components.ViewMarkdownButton().should("exist");
  });

  it("info pane shows only custom content, with no tab navigation", () => {
    RichTextEditor.Components.InfoButton().click();
    RichTextEditor.Components.InfoPaneTabs().should("not.exist");
    RichTextEditor.Components.InfoPaneSection("custom-content").should("exist");
  });
});

describe("SMS literal text rendering", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL_SMS);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
    RichTextEditor.Components.Editor().type("{selectall}{del}");
  });

  const literalSamples = [
    "# not a heading",
    "* not a bullet",
    "- not a bullet either",
    "> not a blockquote",
    "**not bold** and _not italic_",
  ];

  literalSamples.forEach((sample) => {
    it(`renders "${sample}" as literal text`, () => {
      RichTextEditor.Components.Editor().type(sample);
      RichTextEditor.Components.Editor().should("contain.text", sample);

      // Round-trip through markdown view: content must survive unchanged.
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", sample);
    });
  });
});

describe("SMS variables and conditionals still work", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL_SMS);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
    RichTextEditor.Components.Editor().type("{selectall}{del}");
  });

  it("creates a variable when typing ((name))", () => {
    RichTextEditor.Components.Editor().type("((name))");
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1)
      .and("have.text", "name");
  });

  it("creates an inline conditional when typing ((cond??text))", () => {
    RichTextEditor.Components.Editor().type("((eligible??You qualify))");
    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"]')
      .should("have.length", 1);
  });
});
