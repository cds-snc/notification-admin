/// <reference types="cypress" />

const path = "/sitemap";
const sitemap_footer_id = "nav-footer-sitemap";

describe(`Sitemap`, () => {
  context("Has links ordered alphabetically in each category", () => {
    ["en", "fr"].forEach((lang) => {
      it(lang === "en" ? "English" : "French", () => {
        cy.visit(`/sitemap?lang=${lang}`);
        cy.get("main").within(() => {
          cy.get("h2").each((category) => {
            const category_links = category.next("ul").find("a");
            const category_links_text = category_links
              .map((i, el) => Cypress.$(el).text().trim())
              .get();
            const category_links_text_sorted = [...category_links_text].sort();
            expect(category_links_text).to.deep.equal(
              category_links_text_sorted,
            );
          });
        });
      });
    });

    it("Does NOT display the 'You' group when logged out", () => {
      cy.visit(path);
      cy.getByTestId("sitemap-group").should("not.have.text", "Your GC Notify");
    });

    it("Does display the 'You' group when logged in", () => {
      cy.login();
      cy.visit(path);

      cy.getByTestId("sitemap-group").contains("Your GC Notify");
    });
  });

  context("Footer", () => {
    it("Has the sitemap link on app pages when logged out", () => {
      cy.then(Cypress.session.clearCurrentSessionData);
      cy.visit("/activity");

      cy.get(`#${sitemap_footer_id}`).should("be.visible");
    });
    it("Has the sitemap link on GCA pages when logged out", () => {
      cy.then(Cypress.session.clearCurrentSessionData);
      cy.visit("/features");

      cy.get('a[href="/sitemap"]').should("be.visible");
    });
    it("Has the sitemap link on app pages when logged in", () => {
      cy.login();
      cy.visit("/activity");

      cy.get(`#${sitemap_footer_id}`).should("be.visible");
    });
    it("Has the sitemap link on GCA pages when logged in", () => {
      cy.login();
      cy.visit("/features");

      cy.get('a[href="/sitemap"]').should("be.visible");
    });
  });
});
