let Components = {
    TemplateCategoriesTable: () => cy.getByTestId('template-categories-table'),
    AddTemplateCategoryButton: () => cy.getByTestId('add-template-category-button'),
    ConfirmationBanner: () => cy.get('div[role="status"]')
};


let Actions = {
    EditTemplateCategory: (id) => {
        Components.EditTemplateCategoryLink(id).click();
    },
    CreateTemplateCategory: () => {
        Components.AddTemplateCategoryButton().click();
    }
}

let TemplateCategoriesPage = {
    Components,
    ...Actions
};

export default TemplateCategoriesPage;