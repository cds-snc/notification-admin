// Parts of the page a user can interact with
let Components = {
    // Service

    // Emails
    EditEmailBrandingLink: () => cy.getByTestId("edit-email-branding"),
    EmailAnnualLimit: () => cy.getByTestId("email-annual-limit"),

    // Text messages
    SmsAnnualLimit: () => cy.getByTestId("sms-annual-limit"),

    // Platform admin settings
    EditSmsAnnualLimitLink: () => cy.getByTestId("edit-sms-annual-limit"),
    EditEmailAnnualLimitLink: () => cy.getByTestId("edit-email-annual-limit"),
    MessageLimitTextBox: () => cy.get("#message_limit"),
    SubmitButton: () => cy.get("button[type='submit']"),

    // Common
    MessageBanner: () => cy.get("div[role='status']"),
};

let Actions = {
    // Emails
    ClickChangeEmailBrandingLink: () => {
        Components.EditEmailBrandingLink().click();
    },

    // Text messages

    // Platform admin
    ClickChangeEmailAnnualLimitLink: () => {
        Components.EditEmailAnnualLimitLink().click();
    },
    ClickChangeSmsAnnualLimitLink: () => {
        Components.EditSmsAnnualLimitLink().click();
    },
    SetMessageLimit: (limit) => {
        Components.MessageLimitTextBox().clear().type(limit);
    },
    Submit: () => {
        return Components.SubmitButton().click();
    },
};

let ServiceSettingsPage = {
    Components,
    ...Actions
};

export default ServiceSettingsPage;