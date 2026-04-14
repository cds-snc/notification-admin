import React from "react";
import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
import { humanize } from "../../../../support/utils";
import MARKDOWN from "../../../../fixtures/markdownSamples.js";
import SimpleEditor from "../../../../../../app/assets/javascripts/tiptap/SimpleEditor";

const mountEditor = (initialContent = "Welcome to the Editor") => {
  cy.mount(
    <div>
      <label id="rte-label">Template content</label>
      <input type="hidden" id="template-content" value={initialContent} />
      <input type="hidden" id="template-content_mode" value="rte" />
      <SimpleEditor
        inputId="template-content"
        labelId="rte-label"
        initialContent={initialContent}
        lang="en"
        modeInputId="template-content_mode"
        initialMode="rte"
      />
    </div>,
  );
};

describe("Markdown entering and pasting tests", () => {
  beforeEach(() => {
    mountEditor();

    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    RichTextEditor.Components.Editor()
      .should("be.visible")
      .and("contain.text", "Welcome to the Editor")
      .click("topLeft")
      .type("{selectall}{del}{del}")
      .should("have.text", "")
      .and("have.attr", "contenteditable", "true");
  });

  Object.entries(MARKDOWN).forEach(([key, { before, expected }]) => {
    it(`Correctly renders markdown for ${humanize(key)}`, () => {
      RichTextEditor.Components.Editor().type(before, {
        delay: 10,
        timeout: Math.max(before.length * 25, 15000),
      });

      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);

      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("not.exist");

      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
    });
  });

  it("Variables are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.VARIABLES.before);

    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 9);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.VARIABLES.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 9);
  });

  it("Links are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.LINKS.before, {
      timeout: 15000,
    });

    RichTextEditor.Components.Editor().find("a").should("have.length", 10);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.LINKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor().find("a").should("have.length", 10);
  });

  it("Renders initial markdown samples correctly after converting to markdown", () => {
    const concatenatedExpected = Object.values(MARKDOWN)
      .map(({ expected }) => expected)
      .join("\n\n");

    mountEditor(concatenatedExpected);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      concatenatedExpected,
    );
  });

  it("Nested parentheses around variable round-trip: (((var)))", () => {
    RichTextEditor.Components.Editor().type("(((var)))");

    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1)
      .and(($el) => {
        expect($el.text()).to.equal("var");
      });

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should("have.text", "(((var)))");

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor()
      .find('span[data-type="variable"]')
      .should("have.length", 1)
      .and(($el) => {
        expect($el.text()).to.equal("var");
      });
  });

  it("RTL blocks are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.RTL_BLOCKS.before, {
      timeout: 15000,
    });

    RichTextEditor.Components.Editor()
      .find('div[data-type="rtl-block"]')
      .should("have.length", 6);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.RTL_BLOCKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="rtl-block"]')
      .should("have.length", 6);
  });

  it("Inline conditionals are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.INLINE_CONDITIONALS.before);

    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"]')
      .should("have.length", 1);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.INLINE_CONDITIONALS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .find('span[data-type="conditional-inline"]')
      .should("have.length", 1);
  });

  it("Block conditionals are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.BLOCK_CONDITIONALS.before);

    RichTextEditor.Components.Editor()
      .find('div[data-type="conditional"]')
      .should("have.length", 1);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.BLOCK_CONDITIONALS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .find('div[data-type="conditional"]')
      .should("have.length", 1);
  });

  it.skip("Language blocks (EN and FR) are correctly rendered coming back from markdown view", () => {
    RichTextEditor.Components.Editor().type(MARKDOWN.LANG_BLOCKS.before, {
      timeout: 30000,
    });

    RichTextEditor.Components.Editor().find('div[lang="en-CA"]').should("have.length", 9);
    RichTextEditor.Components.Editor().find('div[lang="fr-CA"]').should("have.length", 9);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should(
      "have.text",
      MARKDOWN.LANG_BLOCKS.expected,
    );
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor().find('div[lang="en-CA"]').should("have.length", 9);
    RichTextEditor.Components.Editor().find('div[lang="fr-CA"]').should("have.length", 9);
  });

  context("Pasting markdown content", () => {
    it("RTL blocks are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor().click("topLeft").type("{selectall}{del}{del}");

      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.RTL_BLOCKS.expected,
            types: ["text/plain"],
          },
        });
      });

      RichTextEditor.Components.Editor().find('div[data-type="rtl-block"]').should("have.length", 6);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.RTL_BLOCKS.expected,
      );
    });

    it("Inline conditionals are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor().click("topLeft").type("{selectall}{del}{del}");

      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.INLINE_CONDITIONALS.expected,
            types: ["text/plain"],
          },
        });
      });

      RichTextEditor.Components.Editor()
        .find('span[data-type="conditional-inline"]')
        .should("have.length", 1);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.INLINE_CONDITIONALS.expected,
      );
    });

    it("Block conditionals are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor().click("topLeft").type("{selectall}{del}{del}");

      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.BLOCK_CONDITIONALS.expected,
            types: ["text/plain"],
          },
        });
      });

      RichTextEditor.Components.Editor().find('div[data-type="conditional"]').should("have.length", 1);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.BLOCK_CONDITIONALS.expected,
      );
    });

    it("Language blocks (EN and FR) are correctly rendered when pasted", () => {
      RichTextEditor.Components.Editor().click("topLeft").type("{selectall}{del}{del}");

      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => MARKDOWN.LANG_BLOCKS.expected,
            types: ["text/plain"],
          },
        });
      });

      RichTextEditor.Components.Editor().find('div[lang="en-CA"]').should("have.length", 9);
      RichTextEditor.Components.Editor().find('div[lang="fr-CA"]').should("have.length", 9);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        MARKDOWN.LANG_BLOCKS.expected,
      );
    });

    Object.entries(MARKDOWN).forEach(([key, { expected }]) => {
      it(`Correctly preserves markdown when pasted for ${humanize(key)}`, () => {
        RichTextEditor.Components.Editor().click("topLeft").type("{selectall}{del}{del}");

        RichTextEditor.Components.Editor().then(($editor) => {
          cy.wrap($editor).trigger("paste", {
            clipboardData: {
              getData: () => expected,
              types: ["text/plain"],
            },
          });
        });

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", expected);

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("not.exist");

        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor().should("have.text", expected);
      });
    });
  });

  describe("Heading space auto-fix (markdown conversion)", () => {
    it("Converts `#heading` to `# heading` when switching from markdown view", () => {
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("#heading");
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().find("h1").should("contain.text", "heading");
    });

    it("Converts `##heading` to `## heading` when switching from markdown view", () => {
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("##heading");
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().find("h2").should("contain.text", "heading");
    });

    it("Leaves `# heading` unchanged when switching from markdown view", () => {
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("# heading");
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().find("h1").should("contain.text", "heading");
    });

    it("Leaves `## heading` unchanged when switching from markdown view", () => {
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().clear().type("## heading");
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().find("h2").should("contain.text", "heading");
    });

    it("Preserves other markdown content when fixing heading spacing", () => {
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor()
        .clear()
        .type("#heading\n\nSome **bold** text");
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().find("h1").should("contain.text", "heading");
      RichTextEditor.Components.Editor().find("strong").should("contain.text", "bold");
    });
  });
});
