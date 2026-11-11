import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Table behavior", () => {
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

  it("inserts a 2×2 table with a header row", () => {
    RichTextEditor.Components.TableButton().click();

    RichTextEditor.Components.Editor().find("table").should("have.length", 1);

    RichTextEditor.Components.Editor()
      .find("table th")
      .should("have.length", 2);

    RichTextEditor.Components.Editor()
      .find("table td")
      .should("have.length", 2);
  });

  it("prevents inserting a table inside an existing table", () => {
    RichTextEditor.Components.TableButton().click();

    RichTextEditor.Components.Editor().find("table").should("have.length", 1);

    // Attempt a second table insertion while cursor is inside the table
    RichTextEditor.Components.TableButton().click();

    // Only one table should exist — no nested table
    RichTextEditor.Components.Editor().find("table").should("have.length", 1);

    RichTextEditor.Components.Editor()
      .find("table table")
      .should("have.length", 0);
  });

  it("table content roundtrips through markdown view", () => {
    RichTextEditor.Components.TableButton().click();

    // Type content into the first header cell
    RichTextEditor.Components.Editor()
      .find("table th")
      .first()
      .click()
      .type("Name");

    // Move to second header cell and type
    RichTextEditor.Components.Editor()
      .find("table th")
      .eq(1)
      .click()
      .type("Value");

    // Switch to markdown — should contain pipe-table syntax
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.MarkdownEditor()
      .invoke("val")
      .should("include", "| Name | Value |")
      .and("include", "| --- | --- |");

    // Switch back to visual editor — table should still be present
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor().find("table").should("have.length", 1);

    RichTextEditor.Components.Editor()
      .find("table th")
      .first()
      .should("contain.text", "Name");

    RichTextEditor.Components.Editor()
      .find("table th")
      .eq(1)
      .should("contain.text", "Value");
  });

  it("width marker roundtrips through markdown view", () => {
    // Enter a table in markdown with a column-width marker
    RichTextEditor.Components.ViewMarkdownButton().click();

    const tableMarkdown =
      "[[table-widths:120,240]]\n| Header A | Header B |\n| --- | --- |\n| Cell 1 | Cell 2 |";

    RichTextEditor.Components.MarkdownEditor()
      .clear()
      .type(tableMarkdown, { delay: 0 });

    // Switch to visual editor — width marker paragraph should not appear as text
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.Editor().find("table").should("have.length", 1);

    // The marker paragraph must have been consumed — no visible [[table-widths:...]] text
    RichTextEditor.Components.Editor().should(
      "not.contain.text",
      "[[table-widths:",
    );

    // Switch back to markdown — the width marker should be re-emitted
    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.MarkdownEditor()
      .invoke("val")
      .should("match", /\[\[table-widths:\s*120,240\s*\]\]/);
  });
});
