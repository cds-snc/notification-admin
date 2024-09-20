// Parts of the page a user can interact with
let Components = {
    Filter: () => cy.getByTestId('filter'),
    FilterToggle: () => cy.getByTestId('filter-toggle'),
    Templates: () => cy.getByTestId('template-row'),
    TypeFilter: () => cy.getByTestId('filter-types'),
    CategoryFilter: () => cy.getByTestId('filter-categories'),
    CategoryAll: () => cy.getByTestId('filter-category-all'),
    TypeAll: () => cy.getByTestId('filter-type-all'),
    EmptyState: () => cy.getByTestId('template-empty'),
};

// Actions users can take on the page
let Actions = {
    ToggleFilters: () => {
        Components.FilterToggle().click();
    },
    ApplyTypeFilter: (filter) => {
        Components.TypeFilter().find("a").contains(filter).click();
    },
    ApplyCategoryFilter: (filter) => {
        Components.CategoryFilter().find("a").contains(filter).click();
    },
    ApplyTypeFilterAll: () => {
        Components.TypeAll().click();
    },
    ApplyCategoryFilterAll: () => {
        Components.CategoryAll().click();
    },
};

let TemplateFiltersPage = {
    Components,
    ...Actions
};

export default TemplateFiltersPage;
