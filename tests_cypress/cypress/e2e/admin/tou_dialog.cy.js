import RegisterPage from "../../Notify/Admin/Pages/RegisterPage";

describe("TOU Dialog", () => {
  beforeEach(() => {
    cy.visit("/register");
  });

  context("A11Y", () => {
    it("Is accessible and has valid HTML", () => {
      cy.a11yScan("/register", {
        a11y: true,
        htmlValidate: true,
        deadLinks: false,
        mimeTypes: false,
      });
    });

    it("Has focus set to terms when dialog opens", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Components.TOUTerms().should("have.focus");
    });

    it("Has a trigger that is described by its status", () => {
      RegisterPage.Components.TOUTrigger()
        .should("have.attr", "aria-describedby")
        .then((describedById) => {
          cy.get("#" + describedById).should("be.visible");
        });
    });

    it("Closes when user presses ESC", () => {
      RegisterPage.Components.TOUTrigger().click();
      cy.get("body").type("{esc}");
      RegisterPage.Components.TOUDialog().should("not.be.visible");
      RegisterPage.Components.TOUTrigger().should("have.focus");
    });

    it("Has scrollable terms that are also focusable", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Components.TOUTerms().should("have.focus");
      RegisterPage.Components.TOUDialog().then(($el) => {
        expect($el[0].scrollHeight).to.be.gt($el[0].clientHeight);
      });
    });

    it("Has instruction that is visible before you scroll", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Components.TOUInstruction().should("be.visible");
    });

    it("Has instruction that is visible after you scroll", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.ScrollTerms();
      RegisterPage.Components.TOUInstruction().should("be.visible");
    });
  });

  context("Trigger", () => {
    it("Shows as not-complete on initial load", () => {
      RegisterPage.Components.TOUStatusNotComplete().should("be.visible");
    });

    it("Remains as not-complete if user opens the dialog and clicks [cancel, ESC, close]", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Close();
      RegisterPage.Components.TOUStatusNotComplete().should("be.visible");

      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Cancel();
      RegisterPage.Components.TOUStatusNotComplete().should("be.visible");

      RegisterPage.Components.TOUTrigger().click();
      cy.get("body").type("{esc}");
      RegisterPage.Components.TOUStatusNotComplete().should("be.visible");
    });

    it("Updates to complete after clicking agree", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.AgreeToTerms();
      RegisterPage.Components.TOUStatusComplete().should("be.visible");
    });

    it("Displays error message/error summary if terms not agreed and user submits form", () => {
      RegisterPage.Continue();
      RegisterPage.Components.TOUErrorMessage().should("be.visible");
      RegisterPage.Components.TOUValidationSummaryErrorMessage().should(
        "be.visible",
      );
    });

    it("Error message/summary is removed after agreeing to terms and submitting the form", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.AgreeToTerms();
      RegisterPage.Continue();
      RegisterPage.Components.TOUErrorMessage().should("not.exist");
      RegisterPage.Components.TOUValidationSummaryErrorMessage().should(
        "not.exist",
      );
    });

    it("Can click on error summary and land on dialog trigger", () => {
      RegisterPage.Continue();
      RegisterPage.Components.TOUValidationSummaryErrorMessage().should(
        "be.visible",
      );
      RegisterPage.Components.TOUValidationSummaryErrorMessage().click();
      RegisterPage.Components.TOUTrigger().should("be.visible");
    });
  });

  context("Dialog", () => {
    //     - Dialog opens when trigger is clicked
    it("Opens when trigger is clicked", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Components.TOUDialog().should("be.visible");
    });

    it("Has agree button out of viewport when dialog opens", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Components.TOUAgree().should("not.be.visible");
    });

    it("Has agree button visible when user scrolls to bottom of terms", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.ScrollTerms();
      RegisterPage.Components.TOUAgree().should("not.visible");
    });

    it("Closes when user clicks close/cancel", () => {
      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Cancel();
      RegisterPage.Components.TOUDialog().should("not.be.visible");
      RegisterPage.Components.TOUTrigger().should("have.focus");

      RegisterPage.Components.TOUTrigger().click();
      RegisterPage.Close();
      RegisterPage.Components.TOUDialog().should("not.be.visible");
      RegisterPage.Components.TOUTrigger().should("have.focus");
    });
  });
});
