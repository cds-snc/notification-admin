let PageURL = "/_storybook?component=report-footer";

describe("Report footer component", () => {
  beforeEach(() => {
    cy.visit(PageURL);
  });

  // Components rendered in the storybook
  it("Is accessible", () => {
    cy.a11yScan(PageURL, {
      a11y: true,
      htmlValidate: true,
      deadLinks: false,
      mimeTypes: false,
    });
  });
});