import Page from "../../Notify/Admin/Pages/YourProfilePage";
import { getConfig } from "../../support/utils";

const CONFIG = getConfig();

describe("Your profile", () => {
  beforeEach(() => {
    cy.login();
    cy.visit(Page.URL);
  });

  describe("General", () => {
    it("Passes a11y checks", () => {
      cy.a11yScan(false, {
        a11y: true,
        htmlValidate: true,
        deadLinks: false,
        mimeTypes: false,
        axeConfig: false,
      });
    });

    it("Challenges for password when entering the 2fa settings", () => {
      Page.Change2FAOptions();
      Page.Components.PasswordChallenge().should('exist');
    });
  });
  
  describe("Verification", () => {
    beforeEach(() => {
      // Make the test resilient: if the phone number is not set when the test starts, add one first
      Page.Components.ChangePhoneNumberSection().then($element => {
        if ($element.text().includes('Not set')) {
          cy.log('Setting up phone number for verification badge tests');
          Page.ChangePhoneNumberOptions();
          Page.EnterPhoneNumber();
          Page.SavePhoneNumber();
          
          //verify phone number
          Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
          Page.SelectSMSFor2FA();
          Page.Continue();
          Page.Verify();

          cy.visit(Page.URL); // Reload to see changes
        }
      });
    });

    it("Allows adding a phone number without verifying it", () => {
      Page.ChangePhoneNumberOptions();
      Page.RemovePhoneNumber();
      
      // expect password challenge 
      Page.Components.PasswordChallenge().should('exist');
      
      Page.EnterPassword(CONFIG.CYPRESS_USER_PASSWORD);
      Page.ConfirmPasswordChallenge();

      // expect success message
      // TODO: figure out why this is so slow
      cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Mobile number removed from your profile');

      // put phone number back
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();
    });

    it("Removes verification badge when phone number is removed", () => {
      // verify phone number
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);    
      Page.SelectSMSFor2FA();
      Page.Continue();
      Page.Verify();
      // expect success message and verified badge
      cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');
      Page.Components.TFASMSLabel().should('contain', 'Verified');

      Page.GoBack();

      // remove phone number
      Page.ChangePhoneNumberOptions();
      Page.RemovePhoneNumber();
      Page.Components.PasswordChallenge().should('exist');
      Page.EnterPassword(CONFIG.CYPRESS_USER_PASSWORD);
      Page.ConfirmPasswordChallenge();

      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);    
      Page.Components.TFASMSLabel().should('not.contain', 'Verified');
    });

    it.only("Removes verification badge when phone number is changed", () => {
      // change phone number
      Page.ChangePhoneNumberOptions();
      Page.ChangePhoneNumber();
      Page.EnterPhoneNumber('16132532223'); // test number
      Page.SavePhoneNumber();

      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);    
      Page.Components.TFASMSLabel().should('not.contain', 'Verified');
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
