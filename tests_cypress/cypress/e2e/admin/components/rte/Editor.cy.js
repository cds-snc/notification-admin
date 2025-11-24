import RichTextEditor, {
  FORMATTING_OPTIONS,
} from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Editor accessibility tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  it("Editor has appropriate role and aria-label", () => {
    RichTextEditor.Components.Editor().should("have.attr", "role", "textbox");
    RichTextEditor.Components.Editor().should("have.attr", "aria-labelledby");
    RichTextEditor.Components.Editor().should("have.attr", "aria-multiline");
    RichTextEditor.Components.Editor().should("not.be.empty");
  });
});
