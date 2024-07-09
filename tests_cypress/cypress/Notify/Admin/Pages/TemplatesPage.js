// Parts of the page a user can interact with
let Components = {
    YesAddRecipients: () => cy.contains('a', 'Yes, add recipients').first(),
    EditCurrentTemplateButton: () => cy.getByTestId('edit-template'),
    TemplateCategoryButtonContainer: () => cy.getByTestId('tc_button_container'),
    TemplateCategoryRadiosContainer: () => cy.getByTestId('tc_radios'),
    TemplateCategories: () => cy.getByTestId('template-categories'),
    TCExpandBytton: () => cy.getByTestId('tc_expand_button'),
    // this is the first submit button in the form
    SaveTemplateButton: () => cy.get('button[type="submit"]').first(),
    CreateTemplateButton: () => cy.get('button').contains('Create template'),
    TemplateTypeRadio: () => cy.getByTestId('template-type'),
    ContinueButton: () => cy.contains('button', 'Continue'),
    EmailRadio: () => cy.getByTestId('email'),
    SMSRadio: () => cy.getByTestId('sms')
};

// Actions users can take on the page
let Actions = {
    SelectTemplate: (template_name) => {
        cy.contains('a', template_name).first().click();
        cy.contains('h1', template_name).should('be.visible');
    },
    GotoAddRecipients: () => {
        Components.YesAddRecipients().click();
        //cy.contains('h1', 'Add recipients').should('be.visible');
    },
    EditCurrentTemplate: () => {
        Components.EditCurrentTemplateButton().click();
        cy.contains('h1', 'Edit reusable template').should('be.visible');
    },
    ExpandTemplateCategories: () => {
        Components.TCExpandBytton().click();
    },
    SaveTemplate: () => {
        Components.SaveTemplateButton().click();
    },
    CreateTemplate: () => {
        Components.CreateTemplateButton().click();
        cy.contains('h1', 'Will you send the message by email or text?').should('be.visible');
    },
    SelectTemplateType: (type) => {
        // to lower case

        if (type.toLowerCase() === 'email') {
            Components.EmailRadio().click();
        }
        else if (type.toLowerCase() === 'sms') {
            Components.SMSRadio().click();
        }
    },
    Continue: () => {
        Components.ContinueButton().click()
        cy.contains('h1', 'Create reusable template').should('be.visible');
    },
    SelectTemplateCategory: (category) => {
        Components.TemplateCategories().contains('label', category).click();
    }
};

let TemplatesPage = {
    Components,
    ...Actions
};

export default TemplatesPage;
