// Page object for full_form.html story in Storybook
const AutoFocusPage = {
  Components: {
    NameField: () => cy.getByTestId("test-name"),
    EmailField: () => cy.getByTestId("test-email"),
    ContactMethodField: () => cy.getByTestId("email"),
    ContactAutoFocusField: () => cy.get("#contact_method-error"),
    AutocompleteField: () => cy.get("#autocomplete"),
    AutocompleteAutoFocusField: () => cy.get("#autocomplete-error-message"),
    CheckboxesAutoFocusField: () => cy.get("#main_use_case-error"),
    CheckboxField: () => cy.get("#main_use_case-0"),
    CheckboxAutoFocusField: () => cy.get("#checkbox123-error"),
    RadioField: () => cy.getByTestId("bulk"),
    RadioAutoFocusField: () => cy.get("#process_type-error"),
  },
  Actions: {
    SubmitForm: () => cy.get('button[type="submit"]').click(),
  },
};

describe("Form autofocus", () => {
  const baseUrl =
    "http://localhost:6012/_storybook?component=focus_management/";

  context("Individual component pages", () => {
    it("for textbox", () => {
      cy.visit(`${baseUrl}textbox-form`);
      AutoFocusPage.Actions.SubmitForm();
      AutoFocusPage.Components.NameField().should("have.attr", "autofocus");
    });

    it("for select", () => {
      cy.visit(`${baseUrl}select-form`);
      AutoFocusPage.Actions.SubmitForm();
      AutoFocusPage.Components.ContactMethodField().should(
        "have.attr",
        "autofocus",
      );
    });

    it("for autocomplete", () => {
      cy.visit(`${baseUrl}autocomplete-form`);
      AutoFocusPage.Actions.SubmitForm();
      AutoFocusPage.Components.AutocompleteAutoFocusField().should(
        "have.attr",
        "autofocus",
      );
    });

    it("for checkboxes", () => {
      cy.visit(`${baseUrl}checkboxes-form`);
      AutoFocusPage.Actions.SubmitForm();
      AutoFocusPage.Components.CheckboxField().should("have.attr", "autofocus");
    });

    it("for radios", () => {
      cy.visit(`${baseUrl}radios-form`);
      AutoFocusPage.Actions.SubmitForm();
      AutoFocusPage.Components.RadioField().should("have.attr", "autofocus");
    });
  });

  context("Full form page", () => {
    const formUrl = `${baseUrl}full-form`;

    beforeEach(() => {
      cy.visit(formUrl);
    });

    it("for all field types", () => {
      // ensure there are no autofocus attributes anywhere
      cy.get("[autofocus]").should("not.exist");

      // Step 1: Submit with all fields empty
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the first field with an error
      AutoFocusPage.Components.NameField().should("have.attr", "autofocus");

      // Step 2: Fill in the first field and resubmit
      AutoFocusPage.Components.NameField().type("Test Name");
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.EmailField().should("have.attr", "autofocus");
      AutoFocusPage.Components.NameField().should("not.have.attr", "autofocus");

      // Step 3: Fill in the second field and resubmit
      AutoFocusPage.Components.EmailField().type("test@example.com");
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.ContactMethodField().should(
        "have.attr",
        "autofocus",
      );
      AutoFocusPage.Components.EmailField().should(
        "not.have.attr",
        "autofocus",
      );
      AutoFocusPage.Components.NameField().should("not.have.attr", "autofocus");

      // Step 4: Fill in the third field and resubmit
      AutoFocusPage.Components.ContactMethodField().check();
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.CheckboxField().should("have.attr", "autofocus");
      AutoFocusPage.Components.EmailField().should(
        "not.have.attr",
        "autofocus",
      );
      AutoFocusPage.Components.NameField().should("not.have.attr", "autofocus");

      // Step 5: Fill in the fourth field and resubmit
      AutoFocusPage.Components.AutocompleteField().type("Hal{enter}");
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.CheckboxField().should("have.attr", "autofocus");
      AutoFocusPage.Components.AutocompleteField().should(
        "not.have.attr",
        "autofocus",
      );

      AutoFocusPage.Components.EmailField().should(
        "not.have.attr",
        "autofocus",
      );
      AutoFocusPage.Components.NameField().should("not.have.attr", "autofocus");

      // Step 6: Fill in the fifth field and resubmit
      cy.getByTestId("service").check();
      AutoFocusPage.Components.AutocompleteField().type("Hal{enter}"); // bug with autocomplete losing value when other fields are interacted with
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.CheckboxesAutoFocusField().should("not.exist");
      AutoFocusPage.Components.AutocompleteField().should(
        "not.have.attr",
        "autofocus",
      );
      AutoFocusPage.Components.ContactAutoFocusField().should("not.exist");

      // Step 7: Fill in the sixth field and resubmit
      cy.getByTestId("service").check();
      AutoFocusPage.Components.AutocompleteField().type("Hal{enter}"); // bug with autocomplete losing value when other fields are interacted with
      AutoFocusPage.Actions.SubmitForm();
      // ensure autofocus is on the next field with an error
      AutoFocusPage.Components.RadioField().should("have.attr", "autofocus");
    });

    it("for banners", () => {
      // get banner to show, ensure it takes over autofocus
      cy.visit(formUrl);
      AutoFocusPage.Components.RadioField().check();
      AutoFocusPage.Actions.SubmitForm();
      cy.get(".banner").should("exist");
      cy.get(".banner").should("have.attr", "autofocus");
    });
  });
});
