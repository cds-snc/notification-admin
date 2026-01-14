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

  it("Mailto typed as text serializes to explicit markdown and round-trips", () => {
    // Type an email as plain text and select it
    RichTextEditor.Components.Editor().type("mailto:info@example.com ");

    // Ensure the editor contains a link with mailto href
    RichTextEditor.Components.Editor()
      .find('a[href="mailto:info@example.com"]')
      .should("exist")
      .and("contain.text", "info@example.com");

    // Switch to markdown view
    RichTextEditor.Components.ViewMarkdownButton().click();

    // The markdown textarea should now contain explicit markdown link
    cy.get('[data-testid="markdown-editor"]').should(
      "contain.value",
      "[info@example.com](mailto:info@example.com)",
    );

    // Switch back to RTE and ensure the link still exists
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor()
      .find('a[href="mailto:info@example.com"]')
      .should("exist")
      .and("contain.text", "info@example.com");
  });

  it("Link modal when entering mailto serializes to explicit mailto markdown and round-trips", () => {
    // Enter text and select it
    RichTextEditor.Components.Editor().type("contact us{selectall}");
    RichTextEditor.Components.LinkButton().click();

    // Enter email without mailto in the URL input
    cy.scrollTo("top");
    RichTextEditor.Components.LinkModal.URLInput()
      .clear()
      .type("mailto:info@example.com");
    RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();

    // Link should use mailto: in href (the LinkModal's save logic prepends https if no protocol,
    // but it allows mailto to be used if the user supplies it. Here we expect the editor to
    // interpret plain email as mailto when converted to markdown by our post-process.)
    RichTextEditor.Components.Editor()
      .find('a[href^="mailto:"]')
      .should("exist");

    // Switch to markdown view and ensure encoded correctly
    RichTextEditor.Components.ViewMarkdownButton().click();
    cy.get('[data-testid="markdown-editor"]').should(
      "contain.value",
      "[contact us](mailto:info@example.com)",
    );

    // Switch back and ensure link persists
    RichTextEditor.Components.ViewMarkdownButton().click();
    RichTextEditor.Components.Editor()
      .find('a[href^="mailto:"]')
      .should("exist");
  });
});
