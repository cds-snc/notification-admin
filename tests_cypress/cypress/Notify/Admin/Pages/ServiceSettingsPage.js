// Parts of the page a user can interact with
let Components = {
    // Service

    // Emails
    EditEmailBrandingLink: () => cy.getByTestId("edit-email-branding")

    // Text messages

    // Platform admin settings
};

let Actions = {
    ClickChangeEmailBrandingLink: () => {
        Components.EditEmailBrandingLink().click();
    }
};

let ServiceSettingsPage = {
    Components,
    ...Actions
};

export default ServiceSettingsPage;