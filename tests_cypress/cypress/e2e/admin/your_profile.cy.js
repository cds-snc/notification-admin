import YourProfilePage from "../../Notify/Admin/Pages/YourProfilePage";
// import { getConfig } from "../../support/utils";

// const CONFIG = getConfig();

describe("Your profile", () => {
  beforeEach(() => {
    cy.login();
    cy.visit(YourProfilePage.URL);
  });

  it("Passes a11y checks", () => {
    cy.a11yScan(false, {
      a11y: true,
      htmlValidate: true,
      deadLinks: false,
      mimeTypes: false,
      axeConfig: false,
    });
  });

  // Maybe we should only do this once our tests are run against a db that gets reset
  // if we do this now other parts of the app might not work (like test sends that rely on having a phone number)
  // it("Allows me to enter a blank phone number", () => {
  //     YourProfilePage.Components.ChangePhoneNumberLink().click();

  //     YourProfilePage.Components.PhoneField() .clear().type('{enter}');
  //     YourProfilePage.Components.PhoneField() .should('have.value', '');

  //     YourProfilePage.Components.SaveButton().click();

  //     cy.get('h1').should('contain', 'Change your mobile number');

  //     // Password is required
  //     YourProfilePage.Components.PasswordField().type(CONFIG.CYPRESS_USER_PASSWORD);

  //     YourProfilePage.Components.SaveButton().click();
  //     // Mobile number not set should be somewhere on the page
  //     cy.get('body').should('contain', 'Not set');
  // });
});
