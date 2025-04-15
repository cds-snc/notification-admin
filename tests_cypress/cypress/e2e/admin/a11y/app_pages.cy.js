/// <reference types="cypress" />

import { getTemplateID, getServiceID } from "../../../support/utils";

const CYPRESS_SERVICE_ID = getServiceID("CYPRESS");

const pages = [
  { name: "Landing page", route: "/accounts" },
  { name: "Your profile", route: "/user-profile" },
  // { name: "Dashboard", route: `/services/${CYPRESS_SERVICE_ID}` },
  // {
  //   name: "Dashboard > Notification reports",
  //   route: `/services/${CYPRESS_SERVICE_ID}/notifications/email?status=sending,delivered,failed`,
  // },
  // {
  //   name: "Dashboard > Problem emails",
  //   route: `/services/${CYPRESS_SERVICE_ID}/problem-emails`,
  // },
  // {
  //   name: "Dashboard > Monthly usage",
  //   route: `/services/${CYPRESS_SERVICE_ID}/monthly`,
  // },
  // {
  //   name: "Dashboard > Template usage",
  //   route: `/services/${CYPRESS_SERVICE_ID}/template-usage`,
  // },
  // {
  //   name: "Dashboard > Create template",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates/create?source=dashboard`,
  // },
  // {
  //   name: "Dashboard > Select template",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates?view=sending`,
  // },
  // { name: "API", route: `/services/${CYPRESS_SERVICE_ID}/api` },
  // {
  //   name: "API > Keys",
  //   route: `/services/${CYPRESS_SERVICE_ID}/api/keys`,
  // },
  // {
  //   name: "API > Keys > Create",
  //   route: `/services/${CYPRESS_SERVICE_ID}/api/keys/create`,
  // },
  // {
  //   name: "API > Safelist",
  //   route: `/services/${CYPRESS_SERVICE_ID}/api/safelist`,
  // },
  // {
  //   name: "API > Callbacks",
  //   route: `/services/${CYPRESS_SERVICE_ID}/api/callbacks/delivery-status-callback`,
  // },
  // { name: "Team members", route: `/services/${CYPRESS_SERVICE_ID}/users` },
  // {
  //   name: "Settings",
  //   route: `/services/${CYPRESS_SERVICE_ID}/service-settings`,
  // },
  // {
  //   name: "Settings > Change service name",
  //   route: `/services/${CYPRESS_SERVICE_ID}/service-settings/name`,
  // },
  // {
  //   name: "Templates",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates`,
  // },
  // {
  //   name: "Template > View template",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates/${getTemplateID("SMOKE_TEST_EMAIL")}`,
  // },
  // {
  //   name: "Template > Edit template",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates/${getTemplateID("SMOKE_TEST_EMAIL")}/edit`,
  // },
  // {
  //   name: "Template > Preview template",
  //   route: `/services/${CYPRESS_SERVICE_ID}/templates/${getTemplateID("SMOKE_TEST_EMAIL")}/preview`,
  // },
  // { name: "GC Notify Activity", route: "/activity" },
  // { name: "Contact us", route: "/contact" },
  // { name: "Create an account", route: "/register" },
  // { name: "Sign in", route: "/sign-in" },
  // { name: "Terms of use", route: "/terms" },
];

describe(`A11Y - App pages [${Cypress.env("ENV")}]`, () => {
  for (const page of pages) {
    it(`${page.name}`, () => {
      cy.login();
      cy.a11yScan(page.route, {
        a11y: true,
        htmlValidate: true,
        mimeTypes: false,
        deadLinks: false,
      });
    });
  }
});
