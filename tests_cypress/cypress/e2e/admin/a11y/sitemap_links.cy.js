/// <reference types="cypress" />

import { getHostname } from "../../../support/utils";

let sitemaplinks = [];
const path = "/sitemap";

describe(`Sitemap`, () => {
  it("Has link text that corresponds to page titles", () => {
    cy.visit(path);
    cy.get("main").within(() => {
      cy.get("a").each((link) => {
        sitemaplinks.push({
          url: link.prop("href"),
          text: link.text().trim(),
        });
        const link_url = link.prop("href");
        const link_text = link.text().trim();

        cy.log(`Checking sitemap link: ${link_text}/${link_url}`);
        if (
          link_url.includes(getHostname("Admin")) &&
          !link_url.includes("/#")
        ) {
          cy.visit(link_url);
          cy.get("h1").should("contain", `${link_text}`);
        }
      });
    });
  });
});
