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
        // use realPress to send modifier+K
        cy.realPress([modKey, "k"]);

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
      // type a sentence and make 'with a link' into a link via Cmd/Ctrl+K
      RichTextEditor.Components.Editor()
        .focus()
        .type("line with a link")
        .setSelection("with a link")
        .then(() => {
          // open link modal with realPress
          cy.realPress([modKey, "k"]);
          RichTextEditor.Components.LinkModal.URLInput().type(
            "https://example.com",
          );
          RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();
        });

      // arrow over to the link and ensure modal opens
      RichTextEditor.Components.Editor().type("{uparrow}{uparrow}");
      RichTextEditor.Components.Editor().type(
        "{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}",
      );
      RichTextEditor.Components.LinkModal.Modal()
        .should("exist")
        .and("be.visible");

      // verify link inserted
      RichTextEditor.Components.Editor()
        .find('a[href="https://example.com"]')
        .should("exist")
        .and("contain.text", "with a link");
    });

    it("opens when arrowing left into a link", () => {
      // type text and make the leading word a link via Cmd/Ctrl+K
      RichTextEditor.Components.Editor()
        .focus()
        .type("with a link line")
        .setSelection("with a link")
        .then(() => {
          cy.realPress([modKey, "k"]);
          RichTextEditor.Components.LinkModal.URLInput().type(
            "https://example.com",
          );
          RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();
        });

      // move caret to end and arrow left into link
      RichTextEditor.Components.Editor()
        .click()
        .type("{end}{leftarrow}{leftarrow}{leftarrow}{leftarrow}{leftarrow}");

      RichTextEditor.Components.LinkModal.Modal()
        .should("exist")
        .and("be.visible");
    });

    it("opens when arrowing down into a link", () => {
      // put a link on the second line and select the word 'link'
      RichTextEditor.Components.Editor()
        .focus()
        .type("line1 nothing\nline2 link\nline3 nothing")
        .setSelection("link")
        .then(() => {
          cy.realPress([modKey, "k"]);
          RichTextEditor.Components.LinkModal.URLInput().type(
            "https://example.com",
          );
          RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();
        });

      // place caret on first line and arrow down into the link
      RichTextEditor.Components.Editor()
        .click()
        .type(
          "{home}{uparrow}{uparrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}",
        );
      RichTextEditor.Components.Editor().type("{downarrow}");
      RichTextEditor.Components.LinkModal.Modal()
        .should("exist")
        .and("be.visible");
    });

    it("opens when arrowing up into a link", () => {
      // put a link on the second line and select the word 'link'
      RichTextEditor.Components.Editor()
        .focus()
        .type("line1 nothing\nline2 link\nline3 nothing")
        .setSelection("link")
        .then(() => {
          cy.realPress([modKey, "k"]);
          RichTextEditor.Components.LinkModal.URLInput().type(
            "https://example.com",
          );
          RichTextEditor.Components.LinkModal.Buttons[0].SaveButton().click();
        });

      // place caret on first line and arrow down into the link
      RichTextEditor.Components.Editor()
        .click()
        .type(
          "{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}{rightarrow}",
        );
      RichTextEditor.Components.Editor().type("{uparrow}");
      RichTextEditor.Components.LinkModal.Modal()
        .should("exist")
        .and("be.visible");
    });
  });
});
