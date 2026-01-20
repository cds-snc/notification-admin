import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";
const modKey = Cypress.platform === "darwin" ? "Meta" : "Control";

describe("Link tests", () => {
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

  context("Links with variables", () => {
    it("[link](((var))) converts to link and preserves variable in href", () => {
      // Type the markdown link with variable in URL
      RichTextEditor.Components.Editor().type("[link](((var)))");

      // Verify link is created with correct href containing ((var))
      RichTextEditor.Components.Editor()
        .find("a")
        .should("exist")
        .and("contain.text", "link");
      RichTextEditor.Components.Editor()
        .find('a[href="((var))"]')
        .should("exist");

      // Switch to markdown and verify
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get('[data-testid="markdown-editor"]').should(
        "contain.value",
        "[link](((var)))",
      );

      // Switch back and ensure link persists
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor()
        .find('a[href="((var))"]')
        .should("exist")
        .and("contain.text", "link");
    });

    it("[link](https://example.com/((var))) converts to link and preserves variable in URL", () => {
      // Type the markdown link with variable in URL
      RichTextEditor.Components.Editor().type(
        "[link](https://example.com/((var)))",
      );

      // Verify link is created with correct href
      RichTextEditor.Components.Editor()
        .find("a")
        .should("exist")
        .and("contain.text", "link");
      RichTextEditor.Components.Editor()
        .find('a[href="https://example.com/((var))"]')
        .should("exist");

      // Switch to markdown and verify
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get('[data-testid="markdown-editor"]').should(
        "contain.value",
        "[link](https://example.com/((var)))",
      );

      // Switch back and ensure link persists
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor()
        .find('a[href="https://example.com/((var))"]')
        .should("exist")
        .and("contain.text", "link");
    });

    it("[((var))](https://www.example.com) converts to link with variable link text", () => {
      // Type the markdown link with variable in link text
      RichTextEditor.Components.Editor().type(
        "[((var))](https://www.example.com)",
      );

      // Verify link is created with correct href and variable text
      RichTextEditor.Components.Editor()
        .find('a[href="https://www.example.com"]')
        .should("exist");
      // The link text should contain the variable (styled)
      RichTextEditor.Components.Editor()
        .find("a")
        .should("contain.text", "var");

      // Switch to markdown and verify
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get('[data-testid="markdown-editor"]').should(
        "contain.value",
        "[((var))](https://www.example.com)",
      );

      // Switch back and ensure link persists
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor()
        .find('a[href="https://www.example.com"]')
        .should("exist");
    });

    it("[link ((var))](https://www.example.com) converts to link with variable in link text", () => {
      // Type the markdown link with variable in link text
      RichTextEditor.Components.Editor().type(
        "[link ((var))](https://www.example.com)",
      );

      // Verify link is created with correct href
      RichTextEditor.Components.Editor()
        .find('a[href="https://www.example.com"]')
        .should("exist");
      // The link text should contain both text and variable
      RichTextEditor.Components.Editor()
        .find("a")
        .should("contain.text", "link")
        .and("contain.text", "var");

      // Switch to markdown and verify
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get('[data-testid="markdown-editor"]').should(
        "contain.value",
        "[link ((var))](https://www.example.com)",
      );

      // Switch back and ensure link persists
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor()
        .find('a[href="https://www.example.com"]')
        .should("exist")
        .and("contain.text", "link")
        .and("contain.text", "var");
    });

    it("[((var))](((var2))) converts to link with variables in both text and URL", () => {
      // Type the markdown link with variables in both places
      RichTextEditor.Components.Editor().type("[((var))](((var2)))");

      // Verify link is created with variable in href
      RichTextEditor.Components.Editor()
        .find('a[href="((var2))"]')
        .should("exist");
      // The link text should contain the first variable
      RichTextEditor.Components.Editor()
        .find("a")
        .should("contain.text", "var");

      // Switch to markdown and verify
      RichTextEditor.Components.ViewMarkdownButton().click();
      cy.get('[data-testid="markdown-editor"]').should(
        "contain.value",
        "[((var))](((var2)))",
      );

      // Switch back and ensure link persists
      RichTextEditor.Components.ViewMarkdownButton().click();
      RichTextEditor.Components.Editor()
        .find('a[href="((var2))"]')
        .should("exist")
        .and("contain.text", "var");
    });
  });
});
