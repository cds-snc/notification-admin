let Components = {
    TemplateCategoriesTable: () => cy.getByTestId('template-categories-table'),
    AddTemplateCategoryButton: () => cy.getByTestId('add-template-category-button'),
    ConfirmationBanner: () => cy.get('div[role="status"]')
};


let Actions = {
    EditTemplateCategoryById: (id) => {
        cy.getByTestId(`edit-category-${id}`).click();
    },
    EditTemplateCategoryByName: (name) => {
        cy.get('a').contains(name).click();
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