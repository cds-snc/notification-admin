/// <reference types="cypress" />

import config from "../../../../config";
import { LoginPage } from "../../../Notify/Admin/Pages/AllPages";


const pages = [
    { name: "Landing page", route: "/accounts" },
    { name: "Your profile", route: "/user-profile" },
    { name: "Dashboard", route: `/services/${config.Services.Cypress}` },
    { name: "Dashboard > Notification reports", route: `/services/${config.Services.Cypress}/notifications/email?status=sending,delivered,failed` },
    { name: "Dashboard > Problem emails", route: `/services/${config.Services.Cypress}/problem-emails` },
    { name: "Dashboard > Monthly usage", route: `/services/${config.Services.Cypress}/monthly` },
    { name: "Dashboard > Template usage", route: `/services/${config.Services.Cypress}/template-usage` },
    { name: "Dashboard > Create template", route: `/services/${config.Services.Cypress}/templates/create?source=dashboard` },
    { name: "Dashboard > Select template", route: `/services/${config.Services.Cypress}/templates?view=sending` },
    { name: "API", route: `/services/${config.Services.Cypress}/api` },
    { name: "API > Keys", route: `/services/${config.Services.Cypress}/api/keys` },
    { name: "API > Keys > Create", route: `/services/${config.Services.Cypress}/api/keys/create` },
    { name: "API > Safelist", route: `/services/${config.Services.Cypress}/api/safelist` },
    { name: "API > Callbacks", route: `/services/${config.Services.Cypress}/api/callbacks/delivery-status-callback` },
    { name: "Team members", route: `/services/${config.Services.Cypress}/users` },
    { name: "Settings", route: `/services/${config.Services.Cypress}/service-settings` },
    { name: "Settings > Change service name", route: `/services/${config.Services.Cypress}/service-settings/name` },
    { name: "Templates", route: `/services/${config.Services.Cypress}/templates` },
    { name: "Template > View template", route: `/services/${config.Services.Cypress}/templates/${config.Templates.SMOKE_TEST_EMAIL}` },
    { name: "Template > Edit template", route: `/services/${config.Services.Cypress}/templates/${config.Templates.SMOKE_TEST_EMAIL}/edit` },
    { name: "Template > Preview template", route: `/services/${config.Services.Cypress}/templates/${config.Templates.SMOKE_TEST_EMAIL}/preview` },
    { name: "GC Notify Activity", route: '/activity' },
    { name: "Contact us", route: '/contact' },
    { name: "Create an account", route: '/register' },
    { name: "Sign in", route: '/sign-in' },
];

describe(`A11Y - App pages [${config.CONFIG_NAME}]`, () => {
    retryableBefore(() => {
        LoginPage.Login(Cypress.env('NOTIFY_USER'), Cypress.env('NOTIFY_PASSWORD'));
        cy.task('log', "Running against:" + Cypress.config('baseUrl'))
    });

    for (const page of pages) {
        it(`${page.name}`, () => {
            cy.a11yScan(page.route, { a11y: true, htmlValidate: true, mimeTypes: false, deadLinks: false });
        });
    }
});


/**
 * A `before()` alternative that gets run when a failing test is retried.
 *
 * By default cypress `before()` isn't run when a test below it fails
 * and is retried. Because we use `before()` as a place to setup state
 * before running assertions inside `it()` this means we can't make use
 * of cypress retry functionality to make our suites more reliable.
 *
 * https://github.com/cypress-io/cypress/issues/19458
 * https://stackoverflow.com/questions/71285827/cypress-e2e-before-hook-not-working-on-retries
 */
function retryableBefore(fn) {
    let shouldRun = true;

    // we use beforeEach as cypress will run this on retry attempt
    // we just abort early if we detected that it's already run
    beforeEach(() => {
      if (!shouldRun) return;
      shouldRun = false;
      fn();
    });

    // When a test fails we flip the `shouldRun` flag back to true
    // so when cypress retries and runs the `beforeEach()` before
    // the test that failed, we'll run the `fn()` logic once more.
    Cypress.on('test:after:run', (result) => {
      if (result.state === 'failed') {
        if (result.currentRetry < result.retries) {
          shouldRun = true;
        }
      }
    });
  };