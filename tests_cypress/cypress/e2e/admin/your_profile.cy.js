import Page from "../../Notify/Admin/Pages/YourProfilePage";
import { getConfig } from "../../support/utils";

const CONFIG = getConfig();

// Reusable function to ensure phone number is set up and verified
const ensureVerifiedPhoneNumber = () => {
  Page.Components.ChangePhoneNumberSection().then($element => {
    if ($element.text().includes('Not set')) {
      Page.AddAndVerifyPhoneNumber(Page.TelNo, CONFIG.CYPRESS_USER_PASSWORD);
      cy.visit(Page.URL); // Reload to see changes
    } else {
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);
      Page.AddAndVerifyPhoneNumber(Page.TelNo, CONFIG.CYPRESS_USER_PASSWORD);
    }
  });
};

const ensureNoSecurityKeys = () => {
  Page.Components.ChangeSecurityKeysSection().then($element => {
    if ($element.text().includes('0 security keys')) {
      // No action needed
    } else {
      // Navigate to security keys page
      Page.Components.ChangeSecurityKeysLink().click();
      
      // Keep removing keys until none are left
      const removeNextKey = () => {
        // Check if any security key remove links exist on the page
        cy.get('body').then($body => {
          // Look for security key remove links, excluding those with data-testid (like "New security key" button)
          const securityKeyLinks = $body.find('a[href^="/user-profile/security_keys"]').not('[data-testid]');
          cy.log('Found security key Remove links:', securityKeyLinks.length);
          console.log('Found security key Remove links:', securityKeyLinks);
          cy.pause();
          if (securityKeyLinks.length > 0) {
            // There's at least one security key link, use the page object method
            Page.Components.KeyRemoveButton().click();
            Page.Components.KeyConfirmRemoveButton().click();
            cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Key removed');
            
            // Recursively check for more keys to remove
            removeNextKey();
          } else {
            // No more security key links found, go back to profile
            cy.log('No security key links found, going back to profile');
            cy.visit(Page.URL);
          }
        });
      };
      
      removeNextKey();
    }
  });
}

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
      ensureVerifiedPhoneNumber();
    });

    it("Allows adding a phone number without verifying it", () => {
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);

      // put phone number back
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();
    });

    it("Removes verification badge when phone number is removed", () => {
      // remove phone number
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);

      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should('not.contain', 'Verified');
    });

    it("Removes verification badge when phone number is changed", () => {
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

  describe("2FA defaults", () => {
    it("Defaults to email when set to sms and phone number is removed ", () => {
      ensureVerifiedPhoneNumber();
      // set 2fa to SMS
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SelectSMSFor2FA();
      Page.Components.TFASMSLabel().should('contain', 'Verified');
      Page.Continue();
      cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');

      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);

      Page.Components.Change2FASection().should('contain', 'Code by email');
      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should('not.contain', 'Verified');
    });

    it("Defaults to email when set to sms and phone number is changed", () => {
      ensureVerifiedPhoneNumber();

      // set 2fa to SMS
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SelectSMSFor2FA();
      Page.Components.TFASMSLabel().should('contain', 'Verified');

      Page.Continue();
      cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');

      Page.ChangePhoneNumberOptions();
      Page.ChangePhoneNumber();
      Page.EnterPhoneNumber('16132532223'); // test number
      Page.SavePhoneNumber();

      Page.Components.Change2FASection().should('contain', 'Code by email');
      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should('not.contain', 'Verified');
    });


    it("Security key 2FA fallback - defaults to email when security key is removed", () => {
      ensureNoSecurityKeys();
      let authenticatorId;

      // Set up virtual authenticator
      cy.then(() => {
        return Cypress.automation("remote:debugger:protocol", {
          command: "WebAuthn.enable",
          params: {},
        });
      }).then(() => {
        return Cypress.automation("remote:debugger:protocol", {
          command: "WebAuthn.addVirtualAuthenticator",
          params: {
            options: {
              protocol: "ctap2",
              transport: "internal",
              hasResidentKey: true,
              hasUserVerification: true,
              isUserVerified: true,
            },
          },
        });
      }).then((result) => {
        authenticatorId = result.authenticatorId;
        cy.log('Virtual authenticator created for 2FA test');

        // Add a security key first
        Page.Components.ChangeSecurityKeysLink().click();
        Page.Components.AddSecurityKeyButton().click();
        Page.Components.SecurityKeyName().type('2FA Test Key1');
        Page.Components.SaveButton().click();

        cy.get('h1').should('contain', 'Security keys');


        // Go back to profile to set 2FA to security key
        cy.visit(Page.URL);

        // Set 2FA to use security key
        Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
        Page.SelectKeyFor2FA();

        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');

        // Back on profile page, verify 2FA shows security key
        Page.Components.Change2FASection().should('contain', 'Security key');
        cy.pause();
        // Now remove the security key
        Page.RemoveSecurityKey();

        Page.GoBack();

        // Check that 2FA has fallen back to email
        Page.Components.Change2FASection().should('contain', 'Code by email');

        cy.log('2FA fallback test completed successfully');
      }).then(() => {
        // Cleanup: Remove virtual authenticator
        if (authenticatorId) {
          return Cypress.automation("remote:debugger:protocol", {
            command: "WebAuthn.removeVirtualAuthenticator",
            params: { authenticatorId },
          });
        }
      });
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
