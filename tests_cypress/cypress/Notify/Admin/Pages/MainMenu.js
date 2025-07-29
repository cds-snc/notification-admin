// Parts of the page a user can interact with
let Components = {
    MenuButton: () => cy.get('#menu'),
    Menu: () => cy.get('#main-menu-nav'),
    MenuItems: () => cy.get('#main-menu-nav a'),
};

// Actions users can take on the page
let Actions = {
    OpenMenu: () => {
        Components.MenuButton().click();
        Components.Menu().should('be.visible');
    },
    CloseMenuEsc: () => {
        cy.get("body").type('{esc}');
        cy.get('#main-menu-nav').should('not.be.visible');
    },
    CloseMenuClick: () => {
        cy.get("body").click({force: true});
        cy.get('#main-menu-nav').should('not.be.visible');
    },
    ArrowLeft: () => {
        cy.get("body").type('{leftarrow}');
    },
    ArrowRight: () => {
        cy.get("body").type('{rightarrow}');
    },
    ArrowUp: () => {
        cy.get("body").type('{uparrow}');
    },
    ArrowDown: () => {
        cy.get("body").type('{downarrow}');
    }
};

let MainMenu = {
    Components,
    ...Actions
};

export default MainMenu;
