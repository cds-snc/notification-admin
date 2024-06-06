import config from "../../../../config";

const BrandingRoutes = [
  "/edit-branding",
  "/branding-request",
  "/review-pool",
  "/preview-branding",
  "/branding",
];

describe("Branding A11Y", () => {
  beforeEach(() => {
    // stop the recurring dashboard fetch requests
    cy.intercept("GET", "**/dashboard.json", {});

    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
  });

  // perform a11yScan on all pages in the branding_pages array
  BrandingRoutes.forEach((page) => {
    it(`${page} is accessible and has valid HTML`, () => {
      cy.a11yScan(
        config.Hostnames.Admin + `/services/${config.Services.Cypress}${page}`,
        {
          a11y: true,
          htmlValidate: true,
          deadLinks: false,
          mimeTypes: false,
        },
      );
    });
  });
});
