// Parts of the page a user can interact with
let Components = {
    BackLink: () => cy.getByTestId('go-back'),
    // user profile components
    ChangeNameLink: () => cy.get('[data-testid="user_profile_name"] a'),
    ChangeEmailLink: () => cy.get('[data-testid="user_profile_email"] a'),
    ChangePhoneNumberSection: () => cy.getByTestId('user_profile_mobile_number'),
    ChangePhoneNumberLink: () => cy.get('[data-testid="user_profile_mobile_number"] a'),
    ChangePasswordLink: () => cy.get('[data-testid="user_profile_password"] a'),
    Change2FASection: () => cy.getByTestId('user_profile_2fa'),
    Change2FALink: () => cy.get('[data-testid="user_profile_2fa"] a'),
    ChangeSecurityKeysLink: () => cy.get('[data-testid="user_profile_security_keys"] a'),
    ChangeSecurityKeysSection: () => cy.getByTestId('user_profile_security_keys'),
    ChangePlatformAdminViewLink: () => cy.get('[data-testid="user_profile_disable_platform_admin_view"] a'),
    SaveButton: () => cy.get('button[type="submit"]'),
    // password challenge components
    PasswordField: () => cy.get('input[name="password"]'),
    PasswordChallenge: () => cy.getByTestId('2fa_password_challenge'),
    PasswordChallengeConfirm: () => cy.get('button[type="submit"]'),
    PasswordChallengeCancelButton: () => cy.get('a').contains('Cancel'),
    // phone number change components
    PhoneField: () => cy.get('input[name="mobile_number"]'),
    RemovePhoneNumber: () => cy.getByTestId('remove_mobile_number'),
    ChangePhoneNumberButton: () => cy.get('button[value=edit]'),
    CancelAddPhoneNumberButton: () => cy.get('a').contains('Cancel'),
    // security key components
    AddSecurityKeyButton: () => cy.getByTestId('2fa_add_security_key'),
    TestKeysButton: () => cy.get('button').contains('Test keys'),
    SecurityKeyName: () => cy.get('input[name="keyname"]'),
    KeyRemoveButton: () => cy.get('a[href^="/user-profile/security_keys/"]').contains('Remove'),
    KeyConfirmRemoveButton: () => cy.get('button[name="delete"]'),
    KeyCancelButton: () => cy.get('a').contains('Cancel'),
    // 2fa screen components
    TFAEMAIL: () => cy.getByTestId('email'),
    TFAEmailLabel: () => Components.TFAEMAIL().next('label'),
    TFASMS: () => cy.getByTestId('sms'),
    TFASMSLabel: () => Components.TFASMS().next('label'),
    TFAKey: () => cy.getByTestId('security_key'),
    TFAKeyLabel: () => Components.TFAKey().next('label'),
    AddKey: () => cy.getByTestId('new_key'),
    ContinueButton: () => cy.get('button[type="submit"]'),
    // sms verify components
    VerifyCode: () => cy.get('input[name="two_factor_code"]'),
    VerifyButton: () => cy.get('button[type="submit"]'),
    VerifyCancelButton: () => cy.get('a').contains('Cancel'),
    // menu
    AccountMenuLink: () => cy.get('button[id="account-menu"]').first(),
    SignOutLink: () => cy.get('a[href="/sign-out"]').first(),
    // Send page (this shouldnt really be here)
    SendTestMessageButton: () => cy.getByTestId('send-test'),
};

// Actions users can take on the page
let Actions = {
    GoBack: () => {
        Components.BackLink().click();
    },
    // user profile actions
    ChangePhoneNumberOptions: () => {
        Components.ChangePhoneNumberLink().click();
    },
    Change2FAOptions: () => {
        Components.Change2FALink().click();
    },
    // password confirmation
    ConfirmPasswordChallenge: () => {
        Components.PasswordChallengeConfirm().click();
    },
    PasswordChallengeCancel: () => {
        Components.PasswordChallengeCancelButton().click();
    },
    CompletePasswordChallenge: (password) => {
        Components.PasswordChallenge().should('exist');
        Components.PasswordField().type(password);
        Actions.ConfirmPasswordChallenge();
    },
    // phone number update
    EnterPhoneNumber: (phoneNumber) => {
        if (!phoneNumber) {
            phoneNumber = '16132532222'; // test number
        }
        Components.PhoneField().clear().type(phoneNumber);
    },
    SavePhoneNumber: () => {
        Components.SaveButton().click();
        cy.get('div.banner-default-with-tick').should('contain', 'saved to your profile');
    },
    ChangePhoneNumber: () => {
        Components.ChangePhoneNumberButton().click();
    },
    CancelAddingPhoneNumber: () => {
        Components.CancelAddPhoneNumberButton().click();
    },
    // 2fa actions
    Goto2FASettings: (password) => {
        Components.Change2FALink().click();
        Components.PasswordChallenge().should('exist');
        Components.PasswordField().type(password);
        Actions.ConfirmPasswordChallenge();
    },
    SelectEmailFor2FA: () => {
        Components.TFAEMAIL().click();
        Components.ContinueButton().click();
    },
    SelectSMSFor2FA: () => {
        Components.TFASMS().click();
        Components.ContinueButton().click();
    },
    SelectKeyFor2FA: () => {
        Components.TFAKey().click();
        Components.ContinueButton().click();
    },
    SelectNewKeyFor2FA: () => {
        Components.AddKey().click();
        Components.ContinueButton().click();
    },
    Continue: () => {
        Components.ContinueButton().click();
    },
    // sms
    Verify: () => {
        Components.VerifyCode().type('12345');
        Components.VerifyButton().click();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');
        Components.TFASMSLabel().should('contain', 'Verified');
        Actions.Continue();
        cy.get('h1').should('contain', 'Your profile');
    },
    CancelVerification: () => {
        Components.VerifyCancelButton().click();
    },
    // security key
    MockWebAuthn: () => {
        cy.window().then((win) => {
            // Mock WebAuthn API for security key testing
            const mockCredentials = {
                create: cy.stub().resolves({
                    id: 'mock-security-key-id',
                    rawId: new ArrayBuffer(32),
                    response: {
                        clientDataJSON: new ArrayBuffer(121),
                        attestationObject: new ArrayBuffer(306)
                    },
                    type: 'public-key'
                }),
                get: cy.stub().resolves({
                    id: 'mock-security-key-id',
                    rawId: new ArrayBuffer(32),
                    response: {
                        clientDataJSON: new ArrayBuffer(121),
                        authenticatorData: new ArrayBuffer(196),
                        signature: new ArrayBuffer(70)
                    },
                    type: 'public-key'
                })
            };

            // Override the credentials property
            Object.defineProperty(win.navigator, 'credentials', {
                value: mockCredentials,
                writable: true,
                configurable: true
            });
        });
    },
    AddSecurityKey: (password) => {
        Actions.MockWebAuthn();
        Actions.Goto2FASettings(password);
        Actions.SelectKeyFor2FA();
        // The mocked WebAuthn API will handle the security key interaction
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Security key added');
    },
    AddNamedSecurityKey: (keyName, password) => {
        Components.ChangeSecurityKeysLink().click();
        Components.AddSecurityKeyButton().click();
        Components.SecurityKeyName().type(keyName);

        // Log before clicking continue to see what happens
        cy.log('About to click Continue/Save - WebAuthn ceremony should start');

        Components.SaveButton().click();

        // Wait for either success or any indication the WebAuthn is working
        cy.log('Clicked Continue - waiting for WebAuthn ceremony to complete');

        // You might need to wait for a loading indicator or check what the page shows
        // Try checking what's actually on the page when it times out
        cy.get('body').then($body => {
          cy.log('Page content after clicking Continue:', $body.text());
        });

        // The WebAuthn ceremony should happen automatically here
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Security key added');
    },
    RemoveSecurityKey: (password) => {
        Components.ChangeSecurityKeysLink().click();
        Components.KeyRemoveButton().click();
        Actions.CompletePasswordChallenge(password);
        Components.KeyConfirmRemoveButton().click();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Key removed');
    },
    CancelAddingSecurityKey: () => {
        Components.KeyCancelButton().click();
    },
    ChangeSecurityKeys: () => {
        Components.ChangeSecurityKeysLink().click();
        cy.get('h1').should('contain', 'Manage keys');
    },
    AddNewSecurityKey: () => {
        Components.AddSecurityKeyButton().click();
        cy.get('h1').should('contain', 'Enter password');
    },
    // Composite actions
    AddAndVerifyPhoneNumber: (phoneNumber, password) => {
        Actions.ChangePhoneNumberOptions();
        Actions.EnterPhoneNumber(phoneNumber);
        Actions.SavePhoneNumber();

        // Verify phone number
        Actions.Goto2FASettings(password);
        Actions.SelectSMSFor2FA();
        Actions.Verify();
    },
    RemovePhoneNumber: (password) => {
        Actions.ChangePhoneNumberOptions();
        Components.RemovePhoneNumber().click();
        Components.PasswordChallenge().should('exist');
        Components.PasswordField().type(password);
        Actions.ConfirmPasswordChallenge();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Phone number removed from your profile');
    },
    Set2FAToEmail: (password) => {
        Actions.Goto2FASettings(password);
        Actions.SelectEmailFor2FA();
        Components.Change2FASection().should('contain', 'Code by email');
    },
    Set2FAToSMS: (password) => {
        Actions.Goto2FASettings(password);
        Actions.SelectSMSFor2FA();
        Components.Change2FASection().should('contain', 'Code by text message');
    },
    AddNewKeyFrom2FASettings: () => {
        Components.AddKey().click();
        Components.ContinueButton().click();
        Components.SecurityKeyName().type('2FA Test Key1');
        Components.SaveButton().click();
        // cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Added a security key');
    },
    UpdatePhoneNumber: (phoneNumber) => {
      Actions.ChangePhoneNumberOptions();
      Actions.ChangePhoneNumber();
      Actions.EnterPhoneNumber(phoneNumber);
      Actions.SavePhoneNumber();
    },
    // misc
    SignOut: () => {
        Components.AccountMenuLink().click();
        Components.SignOutLink().click();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'You have been signed out.');
    }
};

let YourProfilePage = {
    URL: '/user-profile', // URL for the page, relative to the base URL
    TelNo: '16132532222', // Default test phone number
    Components,
    ...Actions,
};

export default YourProfilePage;
