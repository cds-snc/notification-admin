let Components = {
    CategoryLabelEn: () => cy.get('[data-testid="name-en"]'),
    CategoryLabelFr: () => cy.get('[data-testid="name-fr"]'),
    CategoryDescriptionEn: () => cy.get('[data-testid="desc-en"]'),
    CategoryDescriptionFr: () => cy.get('[data-testid="desc-fr"]'),
    CategoryHide: () => cy.get('#hidden-0'),
    CategoryShow: () => cy.get('#hidden-1'),
    // TODO: We need a better way to derive default data-testid's for radio lists instead of just the data.option
    // We have two sets of low,med,high and both list's testid's map to bulk, normal, priority so we cant use it
    EmailPriorityLow: () => cy.get('[data-testid="bulk"]'),
    EmailPriorityMedium: () => cy.get('[data-testid="normal"]'),
    EmailPriorityHigh: () => cy.get('[data-testid="priority"]'),
    SMSPriorityLow: () => cy.get('[data-testid="bulk"]'),
    SMSPriorityMedium: () => cy.get('[data-testid="normal"]'),
    SMSPriorityHigh: () => cy.get('[data-testid="priority"]'),
    SMSSendingVehicleLongCode: () => cy.get('[data-testid="long_code"]'),
    SMSSendingVehicleShortCode: () => cy.get('[data-testid="short_code"]'),
    SaveTemplateCategoryButton: () => cy.get('div[class=page-footer] > button'),
    DeleteTemplateCategoryButton: () => cy.get('div[class=page-footer] > span > a'),
    ConfirmDeleteTemplateCategoryButton: () => cy.get('button[name=delete]'),
}

let Actions = {
    SetCategoryLabelEn: (name) => {
        Components.CategoryLabelEn().clear().type(name);
    },
    SetCategoryLabelFr: (name) => {
        Components.CategoryLabelFr().clear().type(name);
    },
    SetCategoryDescriptionEn: (description) => {
        Components.CategoryDescriptionEn().clear().type(description);
    },
    SetCategoryDescriptionFr: (description) => {
        Components.CategoryDescriptionFr().clear().type(description);
    },
    SetCategoryVisibility: (visibility) => {
        switch (visibility) {
            case 'show':
                Components.CategoryShow().check();
                break;
            case 'hide':
                Components.CategoryHide().check();
                break;
            default:
                Components.CategoryShow().check();
        }
    },
    SetEmailPriority: (priority) => {
        switch (priority) {
            case 'low':
                Components.EmailPriorityLow().check();
                break;
            case 'medium':
                Components.EmailPriorityMedium().check();
                break;
            case 'high':
                Components.EmailPriorityHigh().check();
                break;
            default:
                Components.EmailPriorityLow().check();
        }

    },
    SetSMSPriority: (priority) => {
        switch (priority) {
            case 'low':
                Components.SMSPriorityLow().check();
                break;
            case 'medium':
                Components.SMSPriorityMedium().check();
                break;
            case 'high':
                Components.SMSPriorityHigh().check();
                break;
            default:
                Components.SMSPriorityLow().check();
        }
    },
    SetSMSSendingVehicle: (vehicle) => {
        switch (vehicle) {
            case 'long_code':
                Components.SMSSendingVehicleLongCode().check();
                break;
            case 'short_code':
                Components.SMSSendingVehicleShortCode().check();
                break;
            default:
                Components.SMSSendingVehicleLongCode().check();
        }
    },
    FillForm: (nameEn, nameFr, descEn, descFr, visibility, emailPriority, smsPriority, sendingVehicle) => {
        Actions.SetCategoryLabelEn(nameEn);
        Actions.SetCategoryLabelFr(nameFr);
        Actions.SetCategoryDescriptionEn(descEn);
        Actions.SetCategoryDescriptionFr(descFr);
        Actions.SetCategoryVisibility(visibility);
        Actions.SetEmailPriority(emailPriority);
        Actions.SetSMSPriority(smsPriority);
        Actions.SetSMSSendingVehicle(sendingVehicle);
    },
    Submit: () => {
        Components.SaveTemplateCategoryButton().click();
    },
    DeleteTemplateCategory: () => {
        Components.DeleteTemplateCategoryButton().click();
    },
    ConfirmDeleteTemplateCategory: () => {
        Components.ConfirmDeleteTemplateCategoryButton().click();
    }
};

let ManageTemplateCategoryPage = {
    Components,
    ...Actions
};

export default ManageTemplateCategoryPage;