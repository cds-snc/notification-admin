/// <reference types="cypress" />

import config from "../../../../config";

const langs = ["en", "fr"];

const fullPageList = [
  { en: "/accessibility", fr: "/accessibilite" },
  { en: "/features", fr: "/fonctionnalites" },
  { en: "/formatting-emails", fr: "/mettre-en-forme-les-courriels" },
  { en: "/service-level-agreement", fr: "/accord-niveaux-de-service" },
  { en: "/guidance", fr: "/guides-reference" },
  { en: "/home", fr: "/accueil" },
  { en: "/message-delivery-status", fr: "/etat-livraison-messages" },
  { en: "/other-services", fr: "/autres-services" },
  { en: "/privacy", fr: "/confidentialite" },
  { en: "/security", fr: "/securite" },
  { en: "/sending-custom-content", fr: "/envoyer-contenu-personnalise" },
  { en: "/service-level-objectives", fr: "/objectifs-niveau-de-service" },
  { en: "/system-status", fr: "/etat-du-systeme" },
  {
    en: "/understanding-delivery-and-failure",
    fr: "/comprendre-statut-de-livraison",
  },
  {
    en: "/updating-contact-information",
    fr: "/maintenir-a-jour-les-coordonnees",
  },
  { en: "/using-a-spreadsheet", fr: "/utiliser-une-feuille-de-calcul" },
  { en: "/why-gc-notify", fr: "/pourquoi-notification-gc" },
  { en: "/new-features", fr: "/nouvelles-fonctionnalites" },
];

describe(`GCA a11y tests [${config.CONFIG_NAME}]`, () => {
  for (const lang of langs) {
    const currentLang = lang === "en" ? "English" : "Francais";
    context(currentLang, () => {
      for (const page of fullPageList) {
        it(`${page[lang]}`, () => {
          cy.a11yScan(page[lang]);
        });
      }
    });
  }
});

describe("Language toggle works on all pages", () => {
  for (const page of fullPageList) {
    it(`${page.en}`, () => {
      cy.visit(page.en);
      cy.get("#header-lang").click();
      cy.url().should("contain", page.fr);

      cy.get("#header-lang").click();
      cy.url().should("contain", page.en);
    });
  }
});
