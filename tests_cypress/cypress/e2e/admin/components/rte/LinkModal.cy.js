import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
const modKey = Cypress.platform === "darwin" ? "Meta" : "Control";

describe("Link modal tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor
    RichTextEditor.Components.Editor().realPress(["Meta", "A"]);
    RichTextEditor.Components.Editor().type("{selectall}{del}");

    // ensure editor has no text
    RichTextEditor.Components.Editor().should("have.text", "");
  });

  context("Link modal buttons have tooltips", () => {
    // loop over RichTextEditor.Components.LinkModal.Buttons and for each button check tooltip appears on hover
    RichTextEditor.Components.LinkModal.Buttons.forEach((buttonObj) => {
      const buttonName = Object.keys(buttonObj)[0];
      it(`${buttonName} has a tooltip`, () => {
        // enter text, select it, invoke link modal
        RichTextEditor.Components.Editor()
          .focus()
          .type("hello world{selectall}");
        cy.realPress([modKey, "K"]);

        // trigger mouse over
        const button = buttonObj[buttonName]();
        button.trigger("mouseover");

        // ensure tooltip appears
        cy.get(".rte-tooltip-box").should("exist");
        cy.get(".rte-tooltip-label").should("not.be.empty");
      });
    });
  });
  it("Link modal displays when clicking the Link button", () => {
    // enter text, select it, invoke link modal
    RichTextEditor.Components.Editor().type("hello world{selectall}");
    RichTextEditor.Components.LinkButton().click();

    //scroll to top
    cy.scrollTo("top");

    // ensure link modal appears
    RichTextEditor.Components.LinkModal.Modal()
      .should("exist")
      .and("be.visible");
  });

  it("Link modal inserts link into editor", () => {
    // enter text, select it, invoke link modal
    RichTextEditor.Components.Editor().type("hello world{selectall}");
    RichTextEditor.Components.LinkButton().click();

    // enter URL and save
    cy.scrollTo("top");
    RichTextEditor.Components.LinkModal.URLInput().type("https://example.com");
    RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();

    // ensure link is inserted into editor
    cy.scrollTo("top");
    RichTextEditor.Components.Editor()
      .find('a[href="https://example.com"]')
      .should("exist")
      .and("contain.text", "hello world");
  });
});
