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
    ChangePlatformAdminViewLink: () => cy.get('[data-testid="user_profile_disable_platform_admin_view"] a'),
    SaveButton: () => cy.get('button[type="submit"]'),
    // password challenge components
    PasswordField: () => cy.get('input[name="password"]'),
    PasswordChallenge: () => cy.getByTestId('2fa_password_challenge'),
    PasswordChallengeConfirm: () => cy.get('button[type="submit"]'),
    // phone number change components
    PhoneField: () => cy.get('input[name="mobile_number"]'),
    RemovePhoneNumber: () => cy.getByTestId('remove_mobile_number'),
    ChangePhoneNumberButton: () => cy.get('button[value=edit]'),
    // 2fa screen components
    TFAEMAIL: () => cy.getByTestId('email'),
    TFAEmailLabel: () => Components.TFAEMAIL().next('label'),
    TFASMS: () => cy.getByTestId('sms'),
    TFASMSLabel: () => Components.TFASMS().next('label'),
    ContinueButton: () => cy.get('button[type="submit"]'),
    // sms verify components
    VerifyCode: () => cy.get('input[name="two_factor_code"]'),
    VerifyButton: () => cy.get('button[type="submit"]'),
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
    // 2fa actions
    Goto2FASettings: (password) => {
        Components.Change2FALink().click();
        Components.PasswordChallenge().should('exist');
        Components.PasswordField().type(password);
        Actions.ConfirmPasswordChallenge();
    },
    SelectSMSFor2FA: () => {
        Components.TFASMS().click();
        Components.ContinueButton().click();
    },
    Continue: () => {
        Components.ContinueButton().click();
    },
    Verify: () => {
        Components.VerifyCode().type('12345');
        Components.VerifyButton().click();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Two-step verification method updated');
        Components.TFASMSLabel().should('contain', 'Verified');
        Actions.Continue();
        cy.get('h1').should('contain', 'Your profile');
    },
    // Composite actions
    AddAndVerifyPhoneNumber: (phoneNumber, password) => {
        Actions.ChangePhoneNumberOptions();
        Actions.EnterPhoneNumber(phoneNumber);
        Actions.SavePhoneNumber();

        // Verify phone number
        Actions.Goto2FASettings(password);
        Actions.SelectSMSFor2FA();
        Actions.Continue();
        Actions.Verify();
    },
    RemovePhoneNumber: (password) => {
        Actions.ChangePhoneNumberOptions();
        Components.RemovePhoneNumber().click();
        Components.PasswordChallenge().should('exist');
        Components.PasswordField().type(password);
        Actions.ConfirmPasswordChallenge();
        cy.get('div.banner-default-with-tick', { timeout: 15000 }).should('contain', 'Mobile number removed from your profile');
    },
};

let YourProfilePage = {
    URL: '/user-profile', // URL for the page, relative to the base URL
    TelNo: '16132532222', // Default test phone number
    Components,
    ...Actions,
};

export default YourProfilePage;
