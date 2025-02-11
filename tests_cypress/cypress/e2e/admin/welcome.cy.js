import config from "../../../config";
import { WelcomePage } from "../../Notify/Admin/Pages/all";

describe("Welcome Page", () => {
  before(() => {
    cy.login(Cypress.env("NOTIFY_USER"), Cypress.env("NOTIFY_PASSWORD"));
    cy.visit(config.Hostnames.Admin + `/welcome`);
  });

  it("Contains guidance for joining an existing service", () => {
    WelcomePage.Components.GuidanceJoinService().should("be.visible");
    WelcomePage.Components.DetailsJoinService().contains(
      "If you do not have an invitation",
    );
    WelcomePage.ExpandDetailsJoinService();
    WelcomePage.Components.DetailsJoinService()
      .find("p")
      .should("be.visible")
      .and(
        "contain",
        "Ask which team members have permission to invite you. If the team is unsure, from a GC Notify account visit the main menu and select “Team members.” That page:",
      );
    WelcomePage.Components.DetailsJoinService()
      .find("li")
      .should(
        "contain",
        "Includes an invitation button at the top of the page, if the member is permitted to send invitations.",
      )
      .should("be.visible");
    WelcomePage.Components.DetailsJoinService()
      .find("li")
      .should(
        "contain",
        "Includes an invitation button at the top of the page, if the member is permitted to send invitations.",
      )
      .and("be.visible");
  });
});
