import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Variable mark tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().type("{selectall}{del}");

    // ensure editor has no text
    RichTextEditor.Components.Editor().should("have.text", "");
  });

  context("Basic variable functionality", () => {
    it("Creates a variable when typing ((name))", () => {
      RichTextEditor.Components.Editor().type("((variable))");

      // Should have one variable element
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 1)
        .and("have.text", "variable");
    });

    it("Variable appears correctly in markdown", () => {
      RichTextEditor.Components.Editor().type("((myvar))");

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should show variable syntax
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        "((myvar))",
      );
    });

    it("Variable parses correctly from markdown", () => {
      // Switch to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Enter markdown with variable
      RichTextEditor.Components.MarkdownEditor()
        .clear()
        .type("((testvar))", { parseSpecialCharSequences: false });

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should create variable element
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 1)
        .and("have.text", "testvar");
    });
  });

  context("Adjacent variables (regression)", () => {
    it("Adjacent variables remain separate when typed", () => {
      // Type two adjacent variables
      RichTextEditor.Components.Editor().type("((var1))((var2))");

      // Should have two separate variable elements
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 2);

      // Check their text content
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .eq(0)
        .should("have.text", "var1");
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .eq(1)
        .should("have.text", "var2");

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Markdown should show both variables correctly - not merged as ((var1var2))
      RichTextEditor.Components.MarkdownEditor()
        .invoke("text")
        .should("match", /\(\(var1\)\).*\(\(var2\)\)/);
    });

    it("Adjacent variables remain separate when pasted", () => {
      // Paste adjacent variables
      RichTextEditor.Components.Editor().then(($editor) => {
        cy.wrap($editor).trigger("paste", {
          clipboardData: {
            getData: () => "((var1))((var2))",
            types: ["text/plain"],
          },
        });
      });

      // Should have two separate variable elements
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 2);

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should not be merged
      RichTextEditor.Components.MarkdownEditor()
        .invoke("text")
        .should("include", "((var1))")
        .and("include", "((var2))");
    });

    it("Adjacent variables parse correctly from markdown", () => {
      // Switch to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Enter markdown with adjacent variables
      RichTextEditor.Components.MarkdownEditor()
        .clear()
        .type("((variable1))((variable2))", {
          parseSpecialCharSequences: false,
        });

      // Switch back to editor view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should have two separate variable elements
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 2);

      // Verify their content
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .eq(0)
        .should("have.text", "variable1");
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .eq(1)
        .should("have.text", "variable2");

      // Toggle back to markdown to verify no corruption
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.MarkdownEditor()
        .invoke("text")
        .should("include", "((variable1))")
        .and("include", "((variable2))");
    });

    it("Multiple adjacent variables remain separate", () => {
      // Type three adjacent variables
      RichTextEditor.Components.Editor().type("((var1))((var2))((var3))");

      // Should have three separate variable elements
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 3);

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should show all three correctly
      RichTextEditor.Components.MarkdownEditor()
        .invoke("text")
        .should("include", "((var1))")
        .and("include", "((var2))")
        .and("include", "((var3))");
    });

    it("Adjacent variables with text in between remain separate", () => {
      // Type variables with text between them
      RichTextEditor.Components.Editor().type("((var1)) text ((var2))");

      // Should have two separate variable elements
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 2);

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should show correctly with text preserved
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        "((var1)) text ((var2))",
      );
    });

    it("Multiple markdown round-trips preserve adjacent variables", () => {
      // Type adjacent variables
      RichTextEditor.Components.Editor().type("((a))((b))((c))");

      // Do multiple round-trips
      for (let i = 0; i < 3; i++) {
        // To markdown
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.MarkdownEditor()
          .invoke("text")
          .should("include", "((a))")
          .and("include", "((b))")
          .and("include", "((c))");

        // Back to editor
        RichTextEditor.Components.ViewMarkdownButton().click();
        RichTextEditor.Components.Editor()
          .find('span[data-type="variable"]')
          .should("have.length", 3);
      }
    });
  });

  context("Mixed adjacent variables and conditionals", () => {
    it("Adjacent variable and conditional inline remain separate", () => {
      // Type a variable followed by a conditional
      RichTextEditor.Components.Editor().type("((var))((cond??content))");

      // Should have one variable and one conditional
      RichTextEditor.Components.Editor()
        .find('span[data-type="variable"]')
        .should("have.length", 1);
      RichTextEditor.Components.Editor()
        .find('*[data-type="conditional-inline"]')
        .should("have.length", 1);

      // Toggle to markdown view
      RichTextEditor.Components.ViewMarkdownButton().click();

      // Should show both correctly
      RichTextEditor.Components.MarkdownEditor().should(
        "have.text",
        "((var))((cond??content))",
      );
    });
  });
});
