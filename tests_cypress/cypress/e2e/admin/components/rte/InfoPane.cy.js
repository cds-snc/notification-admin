import RichTextEditor from "../../../../Notify/Admin/Components/RichTextEditor";

describe("Info pane", () => {
  beforeEach(() => {
    cy.visit(RichTextEditor.URL);
    RichTextEditor.Components.Toolbar().should("exist").and("be.visible");
  });

  const openInfoPane = () => {
    RichTextEditor.Components.InfoButton().click();
    RichTextEditor.Components.InfoPane().should("be.visible");
  };

  const assertActivePane = (targetId) => {
    RichTextEditor.Components.InfoPane().should(
      "have.attr",
      "data-active-section",
      targetId,
    );

    RichTextEditor.Components.InfoPaneTab(targetId).should(
      "have.attr",
      "aria-current",
      "page",
    );

    RichTextEditor.Components.InfoPaneSections().each(($section) => {
      if ($section.attr("id") === targetId) {
        cy.wrap($section).should("not.have.attr", "hidden");
      } else {
        cy.wrap($section).should("have.attr", "hidden");
      }
    });
  };

  it("opens and closes from the info toolbar button", () => {
    RichTextEditor.Components.InfoButton()
      .should("have.attr", "aria-pressed", "false")
      .click()
      .should("have.attr", "aria-pressed", "true");

    RichTextEditor.Components.InfoPane().should("be.visible");

    RichTextEditor.Components.InfoButton()
      .click()
      .should("have.attr", "aria-pressed", "false");

    RichTextEditor.Components.InfoPane().should("not.exist");
  });

  it("keeps navigation items and sections in sync", () => {
    openInfoPane();

    RichTextEditor.Components.InfoPaneTabs().then(($tabs) => {
      RichTextEditor.Components.InfoPaneSections().should(
        "have.length",
        $tabs.length,
      );

      [...$tabs].forEach((tab) => {
        const targetId = tab.getAttribute("href").slice(1);

        RichTextEditor.Components.InfoPaneSection(targetId).should("exist");
        RichTextEditor.Components.InfoPaneTab(targetId).should(
          "have.length",
          1,
        );
      });
    });
  });

  it("selects the first pane when opened", () => {
    openInfoPane();
    assertActivePane("custom-content");
  });

  it("shows one matching pane for every navigation item", () => {
    openInfoPane();

    RichTextEditor.Components.InfoPaneTabs().each(($tab) => {
      const targetId = $tab.attr("href").slice(1);

      cy.wrap($tab).click();
      assertActivePane(targetId);
    });
  });

  it("does not change the URL when switching panes", () => {
    openInfoPane();

    cy.location("hash").should("eq", "");

    RichTextEditor.Components.InfoPaneTab("email-links").click();

    cy.location("hash").should("eq", "");
    assertActivePane("email-links");
  });

  it("renders no undefined info-pane content", () => {
    openInfoPane();

    RichTextEditor.Components.InfoPane()
      .should("not.contain.text", "undefined")
      .and("not.contain.text", "null");
  });

  it("closes when switching to the Markdown view", () => {
    openInfoPane();

    RichTextEditor.Components.ViewMarkdownButton().click();

    RichTextEditor.Components.InfoPane().should("not.exist");
  });
});
