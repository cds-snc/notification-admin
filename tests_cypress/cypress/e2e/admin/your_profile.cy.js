import Page from "../../Notify/Admin/Pages/YourProfilePage";
import LoginPage from "../../Notify/Admin/Pages/LoginPage";

import { getConfig } from "../../support/utils";

const CONFIG = getConfig();

// ensure phone number is set up and verified
const ensureVerifiedPhoneNumber = () => {
  Page.Components.ChangePhoneNumberSection().then(($element) => {
    if ($element.text().includes("Not set")) {
      Page.AddAndVerifyPhoneNumber(Page.TelNo, CONFIG.CYPRESS_USER_PASSWORD);
      cy.visit(Page.URL); // Reload to see changes
    } else {
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);
      Page.AddAndVerifyPhoneNumber(Page.TelNo, CONFIG.CYPRESS_USER_PASSWORD);
    }

    cy.log("----------------------------------");
    cy.log("Phone number is set and verified. " + Page.TelNo);
    cy.log("----------------------------------");
  });
};
// ensure no phone number is set
const ensureNoPhoneNumber = () => {
  Page.Components.ChangePhoneNumberSection().then(($element) => {
    if ($element.text().includes("Not set")) {
      cy.visit(Page.URL); // Reload to see changes
    } else {
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);
      cy.visit(Page.URL); // Reload to see changes
    }

    cy.log("----------------------------------");
    cy.log("Phone number removed. " + Page.TelNo);
    cy.log("----------------------------------");
  });
};

// ensure profile has no security keys
const ensureNoSecurityKeys = () => {
  Page.Components.ChangeSecurityKeysSection().then(($element) => {
    if ($element.text().includes("0 security keys")) {
      // No action needed
    } else {
      cy.visit(Page.URL); // Reload to see changes

      // Navigate to security keys page
      Page.Components.ChangeSecurityKeysLink().click();

      // Keep removing keys until none are left
      const removeNextKey = () => {
        // Check if any security key remove links exist on the page
        cy.get("body").then(($body) => {
          // Look for security key remove links, excluding those with data-testid, get the first one
          const securityKeyLinks = $body
            .find('a[href^="/user-profile/security_keys"]')
            .not("[data-testid]")
            .first();
          cy.log("Found security key Remove links:", securityKeyLinks.length);
          console.log("Found security key Remove links:", securityKeyLinks);
          if (securityKeyLinks.length > 0) {
            // There's at least one security key link, use the page object method
            Page.Components.KeyRemoveButton().click();
            Page.Components.KeyConfirmRemoveButton().click();
            cy.get("div.banner-default-with-tick", { timeout: 15000 }).should(
              "contain",
              "Key removed",
            );

            // Recursively check for more keys to remove
            removeNextKey();
          } else {
            // No more security key links found, go back to profile
            cy.log("No security key links found, going back to profile");
            cy.visit(Page.URL);
          }
        });
      };

      removeNextKey();
    }

    cy.log("----------------------------------");
    cy.log("Security keys removed. " + Page.TelNo);
    cy.log("----------------------------------");
  });
};

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
      Page.Components.PasswordChallenge().should("exist");
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
      Page.Components.TFASMSLabel().should("not.contain", "Verified");
    });

    it("Removes verification badge when phone number is changed", () => {
      // change phone number
      Page.UpdatePhoneNumber("16132532223");

      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should("not.contain", "Verified");
    });
  });

  describe("2FA defaults", () => {
    it("Defaults to email when set to sms and phone number is removed ", () => {
      ensureVerifiedPhoneNumber();

      // verify 2fa is set to SMS
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should("contain", "Verified");
      Page.GoBack();

      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);

      // expect 2fa to fallback to email
      Page.Components.Change2FASection().should("contain", "Code by email");
      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should("not.contain", "Verified");
    });

    it("Defaults to email when set to sms and phone number is changed", () => {
      ensureVerifiedPhoneNumber();

      // verify 2fa is set to SMS
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should("contain", "Verified");
      Page.GoBack();

      Page.UpdatePhoneNumber("16132532223");

      // expect 2fa to fallback to email
      Page.Components.Change2FASection().should("contain", "Code by email");
      // expect verified badge to be removed
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.Components.TFASMSLabel().should("not.contain", "Verified");
    });

    it("Security key 2FA fallback - defaults to email when security key is removed", () => {
      ensureNoSecurityKeys();
      let authenticatorId;

      // Set up virtual authenticator to handle security keys
      cy.then(() => {
        return Cypress.automation("remote:debugger:protocol", {
          command: "WebAuthn.enable",
          params: {},
        });
      })
        .then(() => {
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
        })
        .then((result) => {
          authenticatorId = result.authenticatorId;
          // main test starts here
          Page.Components.ChangeSecurityKeysLink().click();
          Page.Components.AddSecurityKeyButton().click();
          Page.Components.SecurityKeyName().type("2FA Test Key1");
          Page.Components.SaveButton().click();

          cy.get("h1").should("contain", "Security keys");

          // Go back to profile to set 2FA to security key
          cy.visit(Page.URL);

          // Set 2FA to use security key
          Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
          Page.SelectKeyFor2FA();
          cy.get("div.banner-default-with-tick", { timeout: 15000 }).should(
            "contain",
            "Two-step verification method updated",
          );

          // Back on profile page, verify 2FA shows security key
          Page.Components.Change2FASection().should("contain", "Security key");

          // Now remove the security key and go back
          Page.RemoveSecurityKey();
          Page.GoBack();

          // Check that 2FA has fallen back to email
          Page.Components.Change2FASection().should("contain", "Code by email");
        })
        .then(() => {
          // Cleanup: Remove virtual authenticator
          if (authenticatorId) {
            return Cypress.automation("remote:debugger:protocol", {
              command: "WebAuthn.removeVirtualAuthenticator",
              params: { authenticatorId },
            });
          }
        });

      ensureNoSecurityKeys();
    });
  });

  describe("User's 2FA setting", () => {
    it("Works when set to email", () => {
      Page.Set2FAToEmail(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SignOut();
      // clear cookies
      cy.then(Cypress.session.clearCurrentSessionData);

      cy.visit("/sign-in");

      cy.task("getUserName").then((username) => {
        // cy.visit(LoginPage.URL);
        console.log("Current username:", username.regular.email_address);

        LoginPage.Components.EmailAddress().type(
          username.regular.email_address,
        );
        LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
        LoginPage.Components.SubmitButton().click();

        cy.get("h1").should("contain", "Check your email");
      });
    });

    it("Works when set to SMS w/ verified number", () => {
      ensureVerifiedPhoneNumber();
      Page.Set2FAToSMS(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SignOut();
      // clear cookies
      cy.then(Cypress.session.clearCurrentSessionData);

      cy.visit("/sign-in");

      cy.task("getUserName").then((username) => {
        // cy.visit(LoginPage.URL);
        console.log("Current username:", username.regular.email_address);

        LoginPage.Components.EmailAddress().type(
          username.regular.email_address,
        );
        LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
        LoginPage.Components.SubmitButton().click();

        cy.get("h1").should("contain", "Check your phone messages");
      });
    });

    it("Works and verifies when set to SMS unverified number", () => {
      ensureVerifiedPhoneNumber();

      // update phone number so its unverified
      Page.UpdatePhoneNumber("16132532223");

      // set 2fa to unverified phone number which should prompt to verify (test will fail if it doesnt)
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SelectSMSFor2FA();
      Page.Verify();

      // sign out and check if sms is sent on login
      Page.SignOut();
      cy.then(Cypress.session.clearCurrentSessionData);

      cy.visit("/sign-in");
      cy.task("getUserName").then((username) => {
        LoginPage.Components.EmailAddress().type(
          username.regular.email_address,
        );
        LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
        LoginPage.Components.SubmitButton().click();
        cy.get("h1").should("contain", "Check your phone messages");
      });
    });

    it("Works + prompts + verifies when set to SMS with no number set", () => {
      ensureVerifiedPhoneNumber();

      // remove the phone to start
      Page.RemovePhoneNumber(CONFIG.CYPRESS_USER_PASSWORD);

      // add back and verify a number, and select as 2FA
      Page.AddAndVerifyPhoneNumber(Page.TelNo, CONFIG.CYPRESS_USER_PASSWORD);

      // sign out and check if sms is sent on login
      Page.SignOut();
      cy.then(Cypress.session.clearCurrentSessionData);

      cy.visit("/sign-in");
      cy.task("getUserName").then((username) => {
        LoginPage.Components.EmailAddress().type(
          username.regular.email_address,
        );
        LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
        LoginPage.Components.SubmitButton().click();
        cy.get("h1").should("contain", "Check your phone messages");
      });
    });

    it("Works when set to existing security key", () => {
      ensureNoSecurityKeys();
      let authenticatorId;

      // Set up virtual authenticator to handle security keys
      cy.then(() => {
        return Cypress.automation("remote:debugger:protocol", {
          command: "WebAuthn.enable",
          params: {},
        });
      })
        .then(() => {
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
        })
        .then((result) => {
          authenticatorId = result.authenticatorId;
          // main test starts here
          Page.Components.ChangeSecurityKeysLink().click();
          Page.Components.AddSecurityKeyButton().click();
          Page.Components.SecurityKeyName().type("2FA Test Key1");
          Page.Components.SaveButton().click();

          cy.get("h1").should("contain", "Security keys");

          // Go back to profile to set 2FA to security key
          cy.visit(Page.URL);

          // Set 2FA to use security key
          Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
          Page.SelectKeyFor2FA();

          cy.get("div.banner-default-with-tick", { timeout: 15000 }).should(
            "contain",
            "Two-step verification method updated",
          );

          Page.SignOut();
          cy.then(Cypress.session.clearCurrentSessionData);

          cy.visit("/sign-in");
          cy.task("getUserName").then((username) => {
            LoginPage.Components.EmailAddress().type(
              username.regular.email_address,
            );
            LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
            LoginPage.Components.SubmitButton().click();

            // Wait for the WebAuthn prompt
            cy.get("body").should(
              "contain",
              "We have found a security key associated with your account.",
            );
            // since we can't (yet) login with security keys through cypress, clear the account after this test so a new one is automatically created
            cy.task("clearAccount");
          });
        })
        .then(() => {
          // Cleanup: Remove virtual authenticator
          if (authenticatorId) {
            return Cypress.automation("remote:debugger:protocol", {
              command: "WebAuthn.removeVirtualAuthenticator",
              params: { authenticatorId },
            });
          }
        });
    });

    it("Works when set a new security key", () => {
      ensureNoSecurityKeys();
      let authenticatorId;

      // Set up virtual authenticator to handle security keys
      cy.then(() => {
        return Cypress.automation("remote:debugger:protocol", {
          command: "WebAuthn.enable",
          params: {},
        });
      })
        .then(() => {
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
        })
        .then((result) => {
          authenticatorId = result.authenticatorId;
          // main test starts here
          Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);

          Page.AddNewKeyFrom2FASettings();
          cy.get("h1").should("contain", "Two-step verification method");

          Page.SelectKeyFor2FA();
          cy.get("div.banner-default-with-tick", { timeout: 15000 }).should(
            "contain",
            "Two-step verification method updated",
          );

          Page.SignOut();
          cy.then(Cypress.session.clearCurrentSessionData);

          cy.visit("/sign-in");
          cy.task("getUserName").then((username) => {
            LoginPage.Components.EmailAddress().type(
              username.regular.email_address,
            );
            LoginPage.Components.Password().type(CONFIG.CYPRESS_USER_PASSWORD);
            LoginPage.Components.SubmitButton().click();

            // Wait for the WebAuthn prompt
            cy.get("body").should(
              "contain",
              "We have found a security key associated",
            );
            // since we can't (yet) login with security keys through cypress, clear the account after this test so a new one is automatically created
            cy.task("clearAccount");
          });
        })
        .then(() => {
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

  describe("Navigation", () => {
    it("Password challenge back to user profile when pressing back", () => {
      Page.Change2FAOptions();
      Page.GoBack();
      cy.get("h1").should("contain", "Your profile");
    });
   
    it("Password challenge back to user profile when pressing cancel", () => {
      Page.Change2FAOptions();
      Page.PasswordChallengeCancel();
      cy.get("h1").should("contain", "Your profile");
    });

    it("2FA settings back to user profile when pressing back", () => {
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.GoBack();
      cy.get("h1").should("contain", "Your profile");
    });

    it("2FA -> add a security key back to 2FA settings when pressing back", () => {
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.AddNewKeyFrom2FASettings();
      Page.GoBack();
      cy.get("h1").should("contain", "Two-step verification method");
    });

    it("2FA -> add a security key back to 2FA settings when pressing cancel", () => {
      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.AddNewKeyFrom2FASettings();
      Page.CancelAddingSecurityKey();
      cy.get("h1").should("contain", "Two-step verification method");
    });

    it("2FA -> verify phone back to 2FA settings when pressing back", () => {
      ensureNoPhoneNumber();

      // add unverified phone number
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();

      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SelectSMSFor2FA();

      Page.GoBack();
      cy.get("h1").should("contain", "Two-step verification method");
    });

     it("2FA -> verify phone back to 2FA settings when pressing back", () => {
      ensureNoPhoneNumber();

      // add unverified phone number
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();

      Page.Goto2FASettings(CONFIG.CYPRESS_USER_PASSWORD);
      Page.SelectSMSFor2FA();

      Page.CancelVerification();
      cy.get("h1").should("contain", "Two-step verification method");
    });

    it("Send SMS w/ unverified number back to ready to send when pressing back", () => {
      ensureNoPhoneNumber();

      // add unverified phone number
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();

      cy.visit(`/services/${CONFIG.Services.CYPRESS}/templates/${CONFIG.Templates.SMOKE_TEST_SMS}`);
      Page.Components.SendTestMessageButton().click();
      Page.GoBack();
      cy.get("h2").should("contain", "Ready to send");
    });

    it("Send SMS w/ unverified number back to ready to send when pressing cancel", () => {
      ensureNoPhoneNumber();

      // add unverified phone number
      Page.ChangePhoneNumberOptions();
      Page.EnterPhoneNumber();
      Page.SavePhoneNumber();

      cy.visit(`/services/${CONFIG.Services.CYPRESS}/templates/${CONFIG.Templates.SMOKE_TEST_SMS}`);
      Page.Components.SendTestMessageButton().click();
      Page.CancelVerification();
      cy.get("h2").should("contain", "Ready to send");
    });

    it("Send SMS w/ no number back to ready to send when pressing back", () => {
      ensureNoPhoneNumber();

      cy.visit(`/services/${CONFIG.Services.CYPRESS}/templates/${CONFIG.Templates.SMOKE_TEST_SMS}`);
      Page.Components.SendTestMessageButton().click();
      Page.GoBack();
      cy.get("h2").should("contain", "Ready to send");
    });

     it("Send SMS w/ no number back to ready to send when pressing cancel", () => {
      ensureNoPhoneNumber();

      cy.visit(`/services/${CONFIG.Services.CYPRESS}/templates/${CONFIG.Templates.SMOKE_TEST_SMS}`);
      Page.Components.SendTestMessageButton().click();
      Page.CancelAddingPhoneNumber();
      cy.get("h2").should("contain", "Ready to send");
    });
  });
});
