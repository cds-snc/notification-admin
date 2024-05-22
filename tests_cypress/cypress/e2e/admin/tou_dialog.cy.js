// test scenarios:
// - modal pops up when logged in
// - modal doesnt popup when not logged in
// - modal doesnt popup after being dismissed
// - cant tab to things behind modal
// - navigating to page before modal is dismissed shows modal again
// - modal is dismissable
// - modal is not dismissable

import config from "../../../config";
import TouDialog from "../../Notify/Admin/Pages/TouDialog";

describe('TOU Dialog', () => {
    it('should display the modal when logged in', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.visit('/');
        
        TouDialog.Components.Dialog().should('be.visible');
    });

    it('should not display the modal after being dismissed', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.visit('/');
        
        TouDialog.Components.Dialog().should('be.visible');
        TouDialog.AgreeToTerms();
        TouDialog.Components.Dialog().should('not.exist');
    });
    
    it('should not display the modal when not logged in', () => {
        cy.visit('/');

        TouDialog.Components.Dialog().should('not.exist');
    });

    it('should handle tabbing and prevent focusing on elements behind the modal', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.visit('/');
        
        TouDialog.Components.Dialog().should('be.visible');
        TouDialog.Components.Heading().should('have.focus');
        cy.focused().parents('dialog').should('exist');

        // scroll to enable agree button
        TouDialog.Components.Terms().scrollTo('bottom', { ensureScrollable: false });

        // pressing shift+tab should not focus on anything in the `document` element
        cy.realPress(["Shift", "Tab"]);
        cy.focused().should('not.exist');

        // pressing tab should focus on the heading once again
        cy.realPress("Tab");
        TouDialog.Components.Heading().should('have.focus');
        
        // pressing tab should focus on the terms
        cy.realPress("Tab");
        TouDialog.Components.Terms().should('have.focus');

        // pressing tab should focus on the agree button
        cy.realPress("Tab");
        TouDialog.Components.DismissButton().should('have.focus');

        // pressing tab, focus should leave the `document` now and go within the browser
        cy.realPress("Tab");
        cy.focused().should('not.exist');        
    });

    it('should display the modal again when navigating to the page before modal is dismissed', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.visit('/');
        TouDialog.Components.Dialog().should('be.visible');

        cy.visit('/accounts');
        TouDialog.Components.Dialog().should('be.visible');
    });

    it('should not be dismissable by ESC key', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        
        cy.visit('/');

        TouDialog.Components.Dialog().should('be.visible');
        TouDialog.Components.ErrorMessage().should('not.be.visible');
        
        cy.get("body").type('{esc}');
        TouDialog.Components.Dialog().should('be.visible');
        TouDialog.Components.ErrorMessage().should('be.visible');
    });

    it('has a enabled agree button when the terms have been scrolled', () => {
        cy.login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.viewport(1280, 550)
        cy.visit('/');
        
        TouDialog.Components.Dialog().should('be.visible');
        TouDialog.Components.DismissButton().should('be.disabled');

        TouDialog.Components.Terms().scrollTo('bottom', { ensureScrollable: false });
        TouDialog.Components.DismissButton().should('be.enabled');

    });
});