import React from "react";
import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
import { humanize } from "../../../../support/utils";
import MARKDOWN from "../../../../fixtures/markdownSamples.js";
import SimpleEditor from "../../../../../../app/assets/javascripts/tiptap/SimpleEditor";

const mountEditor = (
  initialContent = "Welcome to the Editor",
  initialMode = "rte",
) => {
  cy.mount(
    <div>
      <label id="rte-label">Template content</label>
      <input type="hidden" id="template-content" value={initialContent} />
      <input type="hidden" id="template-content_mode" value={initialMode} />
      <SimpleEditor
        inputId="template-content"
        labelId="rte-label"
        initialContent={initialContent}
        lang="en"
        modeInputId="template-content_mode"
        initialMode={initialMode}
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

  it("Loads in markdown mode on initial render", () => {
    mountEditor("Welcome to the Editor", "markdown");

    RichTextEditor.Components.MarkdownEditor()
      .should("be.visible")
      .and("be.enabled")
      .and("have.value", "Welcome to the Editor");
    RichTextEditor.Components.Toolbar().should("be.visible");

    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor()
      .should("be.visible")
      .and("contain.text", "Welcome to the Editor");
  });

  ["markdown", "rte"].forEach((mode) => {
    it(`Preserves literal backticks on load and mode switches from ${mode}`, () => {
      const content = "`backticks` and ``double backticks`` and unmatched `";
      mountEditor(content, mode);

      RichTextEditor.Components.Toolbar().should("be.visible");
      cy.get("#template-content").should("have.value", content);

      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get("#template-content").should("have.value", content);
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get("#template-content").should("have.value", content);

      if (mode === "markdown") {
        RichTextEditor.Components.MarkdownEditor().should("have.value", content);
      } else {
        RichTextEditor.Components.Editor().should("have.text", content);
      }
    });
  });

  it("Preserves submitted backticks when reopening without editing", () => {
    mountEditor("", "markdown");
    RichTextEditor.Components.MarkdownEditor().type("`backticks`");
    cy.get("#template-content")
      .should("have.value", "`backticks`")
      .invoke("val")
      .then((savedContent) => {
        mountEditor(savedContent, "markdown");
      });

    RichTextEditor.Components.MarkdownEditor()
      .should("be.enabled")
      .and("have.value", "`backticks`");
    cy.get("#template-content").should("have.value", "`backticks`");
  });

  [1, 2, 3].forEach((count) => {
    it(`Preserves ${count} literal backslashes before backticks in email round trips`, () => {
      const literal = "\\".repeat(count) + "`escaped" + "\\".repeat(count) + "`";
      const markdown =
        "\\".repeat(count * 2) + "`escaped" + "\\".repeat(count * 2) + "`";
      mountEditor(markdown);

      RichTextEditor.Components.Editor().should("have.text", literal);
      cy.get("#template-content").should("have.value", markdown);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor().should("have.value", markdown);
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor().should("have.text", literal);
      cy.get("#template-content")
        .should("have.value", markdown)
        .invoke("val")
        .then((savedContent) => {
          mountEditor(savedContent);
        });
      RichTextEditor.Components.Editor().should("have.text", literal);
      cy.get("#template-content").should("have.value", markdown);
    });
  });

  it("Treats single backslashes before email backticks as Markdown escapes", () => {
    mountEditor("\\`escaped\\`");

    RichTextEditor.Components.Editor().should("have.text", "`escaped`");
    cy.get("#template-content").should("have.value", "`escaped`");
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should("have.value", "`escaped`");
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor().should("have.text", "`escaped`");
    cy.get("#template-content").should("have.value", "`escaped`");
  });

  it("Preserves HTML escaping and other markdown syntax alongside backticks", () => {
    const content =
      "`backticks` &lt;literal&gt; **bold** *italic* \\*literal stars\\*";
    mountEditor(content);

    RichTextEditor.Components.Editor().should(
      "have.text",
      "`backticks` <literal> bold italic *literal stars*",
    );
    RichTextEditor.Components.Editor().find("literal").should("not.exist");
    RichTextEditor.Components.Editor().find("strong").should("have.text", "bold");
    RichTextEditor.Components.Editor().find("em").should("have.text", "italic");
    cy.get("#template-content").should("have.value", content);

    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.MarkdownEditor().should("have.value", content);
    RichTextEditor.Components.ViewMarkdownButton().click();
    cy.get("#template-content").should("have.value", content);
  });

  it("Does not remove backslashes before backticks in link targets", () => {
    const href = "https://example.com/path\\`part";
    mountEditor(`<a href="${href}">\`label\`</a>`);

    RichTextEditor.Components.Editor()
      .find("a")
      .should("have.attr", "href", href)
      .and("have.text", "`label`");
    cy.get("#template-content").should("have.value", `[\`label\`](${href})`);
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

  it("Language blocks (EN and FR) are correctly rendered coming back from markdown view", () => {
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
          force: true,
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
          force: true,
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
          force: true,
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
          force: true,
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
            force: true,
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
