import { Templates } from "../../../../config";

// Parts of the page a user can interact with
let Components = {
    Filter: () => cy.getByTestId('filter'),
    FilterToggle: () => cy.getByTestId('filter-toggle'),
    Templates: () => cy.getByTestId('template-row'),
    TypeFilter: () => cy.getByTestId('filter-types'),
    CategoryFilter: () => cy.getByTestId('filter-categories'),
};

// Actions users can take on the page
let Actions = {
    ToggleFilters: () => {
        Components.FilterToggle().click();
    }
};

let TemplateFiltersPage = {
    Components,
    ...Actions
};

export default TemplateFiltersPage;
