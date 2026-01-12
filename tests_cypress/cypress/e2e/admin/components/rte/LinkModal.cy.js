import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
const modKey = Cypress.platform === "darwin" ? "Meta" : "Control";
const modToken = modKey === "Meta" ? "meta" : "ctrl";

describe("Link modal tests", () => {
  beforeEach(() => {
    // Load the editor and ensure toolbar is ready for interactions
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");

    // Start each test with a cleared editor (use .type for modifier keys)
    RichTextEditor.Components.Editor().type(`{${modToken}a}`);
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
        // use .type to send modifier+K
        RichTextEditor.Components.Editor().type(`{${modToken}k}`);

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

  context("Arrow key navigation opens modal", () => {
    it("opens when arrowing right into a link", () => {
      // type text and insert link for 'world'
      RichTextEditor.Components.Editor()
        .focus()
        .type("hello world")
        .then(() => {
          // select the word 'world' (move cursor left then shift-select)
          RichTextEditor.Components.Editor().type("{leftarrow}{leftarrow}{leftarrow}{leftarrow}{shift}{rightarrow}{rightarrow}{rightarrow}{rightarrow}");
          RichTextEditor.Components.Editor().type(`{${modToken}k}`);
          RichTextEditor.Components.LinkModal.URLInput().type("https://example.com");
          RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();
        });

      // move caret to start and arrow right into link
      RichTextEditor.Components.Editor().click().type("{home}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}");

      RichTextEditor.Components.LinkModal.Modal().should("exist").and("be.visible");
    });

    it("opens when arrowing left into a link", () => {
      // create a linked range at the start of the text
      RichTextEditor.Components.Editor().focus().type("hello world");
      RichTextEditor.Components.Editor().type("{selectall}");
      RichTextEditor.Components.Editor().type(`{${modToken}k}`);
      RichTextEditor.Components.LinkModal.URLInput().type("https://example.com");
      RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();

      // move caret to end and arrow left into link
      RichTextEditor.Components.Editor().click().type("{end}{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}");

      RichTextEditor.Components.LinkModal.Modal().should("exist").and("be.visible");
    });

    it("opens when arrowing down into a link", () => {
      // put a link on the second line
      RichTextEditor.Components.Editor().focus().type("line1\nline2 link\nline3");
      // select 'link' and make it a link
      RichTextEditor.Components.Editor().type("{uparrow}{selectall}");
      RichTextEditor.Components.Editor().type(`{${modToken}k}`);
      RichTextEditor.Components.LinkModal.URLInput().type("https://example.com");
      RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();

      // place caret on first line and arrow down into the link
      RichTextEditor.Components.Editor().click().type("{home}{downarrow}{downarrow}");

      RichTextEditor.Components.LinkModal.Modal().should("exist").and("be.visible");
    });
  });
});
