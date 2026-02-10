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

    // Editor should have 10 marked up links
    RichTextEditor.Components.Editor().find("a").should("have.length", 10);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.LINKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should have 10 marked up links
    RichTextEditor.Components.Editor().find("a").should("have.length", 10);
  });

  it("Renders initial markdown samples correctly after converting to markdown", () => {
    // Visit the Storybook page for the text editor
    cy.visit(
      "http://localhost:6012/_storybook?component=text-editor-tiptap-complex-markdown",
    );

    // Ensure the editor is loaded
    RichTextEditor.Components.Editor().should("exist");

    // Switch to markdown mode
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Concatenate all expected values from markdownSamples
    const concatenatedExpected = Object.values(MARKDOWN)
      .map(({ expected }) => expected)
      .join("\n\n");

    // Assert that the editor's content matches the concatenated expected values
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      concatenatedExpected,
    );
  });

  it("Nested parentheses around variable round-trip: (((var)))", () => {
    // Type the nested parentheses variable into the editor
    RichTextEditor.Components.Editor().type("(((var)))");

    // Ensure variable span is present and only wraps 'var'
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1)
      .and(($el) => {
        expect($el.text()).to.equal("var");
      });

    // Switch to markdown mode and ensure markdown shows the original text
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should("have.text", "(((var)))");

    // Switch back to RTE and ensure variable still renders correctly
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1)
      .and(($el) => {
        expect($el.text()).to.equal("var");
      });
  });

  it("RTL blocks are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.RTL_BLOCKS.before);

    // Editor should have marked up RTL blocks
    RichTextEditor.Components.Editor()
      .find('div[data-type="rtl-block"]')
      .should("have.length", 6);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.RTL_BLOCKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should still have marked up RTL blocks
    RichTextEditor.Components.Editor()
      .find('div[data-type="rtl-block"]')
      .should("have.length", 6);
  });

  it("Inline conditionals are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(
      MARKDOWN.INLINE_CONDITIONALS.before,
    );

    // Editor should have marked up inline conditionals
    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"]')
      .should("have.length", 1);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.INLINE_CONDITIONALS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should still have marked up inline conditionals
    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"]')
      .should("have.length", 1);
  });

  it("Block conditionals are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.BLOCK_CONDITIONALS.before);

    // Editor should have marked up block conditionals
    RichTextEditor.Components.Editor()
      .find('div[data-type="conditional"]')
      .should("have.length", 1);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.BLOCK_CONDITIONALS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should still have marked up block conditionals
    RichTextEditor.Components.Editor()
      .find('div[data-type="conditional"]')
      .should("have.length", 1);
  });

  it("Language blocks (EN and FR) are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.LANG_BLOCKS.before);

    // Editor should have marked up language blocks
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .should("have.length", 9);
    RichTextEditor.Components.Editor()
      .find('div[lang="fr-CA"]')
      .should("have.length", 9);

    // Switch to markdown mode and back
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.LANG_BLOCKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    // Editor should still have marked up language blocks
    RichTextEditor.Components.Editor()
      .find('div[lang="en-CA"]')
      .should("have.length", 9);
    RichTextEditor.Components.Editor()
      .find('div[lang="fr-CA"]')
      .should("have.length", 9);
  });

  context("Pasting markdown content", () => {
    it("RTL blocks are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor()
        .click("topLeft")
        .type("{selectall}{del}{del}");

      // Paste the markdown content
      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.RTL_BLOCKS.expected,
            types: ["text/plain"],
          },
        });
      });

      // Editor should have marked up RTL blocks
      RichTextEditor.Components.Editor()
        .find('div[data-type="rtl-block"]')
        .should("have.length", 6);

      // Switch to markdown mode and back
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.RTL_BLOCKS.expected,
      );
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Editor should still have marked up RTL blocks
      RichTextEditor.Components.Editor()
        .find('div[data-type="rtl-block"]')
        .should("have.length", 6);
    });

    it("Inline conditionals are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor()
        .click("topLeft")
        .type("{selectall}{del}{del}");

      // Paste the markdown content
      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.INLINE_CONDITIONALS.expected,
            types: ["text/plain"],
          },
        });
      });

      // Editor should have marked up inline conditionals
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("have.length", 1);

      // Switch to markdown mode and back
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.INLINE_CONDITIONALS.expected,
      );
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Editor should still have marked up inline conditionals
      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("have.length", 1);
    });

    it("Block conditionals are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor()
        .click("topLeft")
        .type("{selectall}{del}{del}");

      // Paste the markdown content
      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.BLOCK_CONDITIONALS.expected,
            types: ["text/plain"],
          },
        });
      });

      // Editor should have marked up block conditionals
      RichTextEditor.Components.Editor()
        .find('div[data-type="conditional"]')
        .should("have.length", 1);

      // Switch to markdown mode and back
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.BLOCK_CONDITIONALS.expected,
      );
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Editor should still have marked up block conditionals
      RichTextEditor.Components.Editor()
        .find('div[data-type="conditional"]')
        .should("have.length", 1);
    });

    it("Language blocks (EN and FR) are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor()
        .click("topLeft")
        .type("{selectall}{del}{del}");

      // Paste the markdown content
      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.LANG_BLOCKS.expected,
            types: ["text/plain"],
          },
        });
      });

      // Editor should have marked up language blocks
      RichTextEditor.Components.Editor()
        .find('div[lang="en-CA"]')
        .should("have.length", 9);
      RichTextEditor.Components.Editor()
        .find('div[lang="fr-CA"]')
        .should("have.length", 9);

      // Switch to markdown mode and back
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.LANG_BLOCKS.expected,
      );
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Editor should still have marked up language blocks
      RichTextEditor.Components.Editor()
        .find('div[lang="en-CA"]')
        .should("have.length", 9);
      RichTextEditor.Components.Editor()
        .find('div[lang="fr-CA"]')
        .should("have.length", 9);
    });

    Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
      it(`Correctly preserves markdown when pasted for ${humanize(key)}`, () => {
        // Clear the editor first
        RichTextEditor.Components.Editor()
          .click("topLeft")
          .type("{selectall}{del}{del}");

        // Paste the markdown content
        RichTextEditor.Components.Editor().then(($editor) => {
          cy.wrap($editor).trigger("paste", {
            clipboardData: {
              getData: () => expected,
              types: ["text/plain"],
            },
          });
        });

        // Switch to markdown view and verify the content
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should(
          "have.text",
          expected,
        );

        // Switch back to editor view and ensure no data loss
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        // Switch back to markdown and ensure content is still correct
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should(
          "have.text",
          expected,
        );
      });
    });
  });
  describe.only("Heading space auto-fix (markdown conversion)", () => {
    it("Converts `#heading` to `# heading` when switching from markdown view", () => {
      // Switch to markdown view and enter heading without space
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("#heading");

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should be converted to proper h1 heading
      RichTextEditor.Components.Editor().find("h1").should("exist");
      RichTextEditor.Components.Editor()
        .find("h1")
        .should("contain.text", "heading");
    });

    it("Converts `##heading` to `## heading` when switching from markdown view", () => {
      // Switch to markdown view and enter heading without space
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("##heading");

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should be converted to proper h2 heading
      RichTextEditor.Components.Editor().find("h2").should("exist");
      RichTextEditor.Components.Editor()
        .find("h2")
        .should("contain.text", "heading");
    });

    it("Leaves `# heading` unchanged when switching from markdown view", () => {
      // Switch to markdown view and enter correct heading syntax
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("# heading");

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should be rendered as h1 heading
      RichTextEditor.Components.Editor().find("h1").should("exist");
      RichTextEditor.Components.Editor()
        .find("h1")
        .should("contain.text", "heading");
    });

    it("Leaves `## heading` unchanged when switching from markdown view", () => {
      // Switch to markdown view and enter correct heading syntax
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("## heading");

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should be rendered as h2 heading
      RichTextEditor.Components.Editor().find("h2").should("exist");
      RichTextEditor.Components.Editor()
        .find("h2")
        .should("contain.text", "heading");
    });

    it("Preserves other markdown content when fixing heading spacing", () => {
      // Switch to markdown view and enter mixed content
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor()
        .clear()
        .type("#heading\n\nSome **bold** text");

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should have heading and formatted text
      RichTextEditor.Components.Editor()
        .find("h1")
        .should("contain.text", "heading");
      RichTextEditor.Components.Editor()
        .find("strong")
        .should("contain.text", "bold");
    });
  });
});
