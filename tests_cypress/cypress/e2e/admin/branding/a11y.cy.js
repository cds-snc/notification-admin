const CYPRESS_SERVICE_ID = Cypress.env("CYPRESS_SERVICE_ID");

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

    cy.login();
  });

  // perform a11yScan on all pages in the branding_pages array
  BrandingRoutes.forEach((page) => {
    it(`${page} is accessible and has valid HTML`, () => {
      cy.a11yScan(`/services/${CYPRESS_SERVICE_ID}${page}`, {
        a11y: true,
        htmlValidate: true,
        deadLinks: false,
        mimeTypes: false,
        axeConfig: [
          {
            id: "aria-allowed-role",
            enabled: false,
          },
        ],
      });
    });
  });
});
