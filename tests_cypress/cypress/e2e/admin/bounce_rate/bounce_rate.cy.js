/// <reference types="cypress" />

import config from "../../../../config";
import { LoginPage, AccountsPage } from "../../../Notify/Admin/Pages/all";
import Notify from "../../../Notify/NotifyAPI";

const ADMIN_COOKIE = 'notify_admin_session';
describe('Basic login', () => {

    // Login to notify before the test suite starts
    before(() => {
        Cypress.config('baseUrl', config.Hostnames.Admin); // use hostname for this environment

        // LoginPage.Login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));

        // // ensure we logged in correctly
        // cy.contains('h1', 'Sign-in history').should('be.visible');
    });

    // Before each test, persist the auth cookie so we don't have to login again
    beforeEach(() => {
        // stop the recurring dashboard fetch requests
        cy.intercept('GET', '**/dashboard.json', {});
    });

    it('can create new service', () => {
        cy.visit(AccountsPage.URL);
        // Cypress.config('baseUrl', config.Hostnames.API)
        // Notify.Admin.CreateService();
        //AccountsPage.AddService();        
    });
});