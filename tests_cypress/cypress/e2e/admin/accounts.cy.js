import { AccountsPage } from "../../Notify/Admin/Pages/all";

describe("Accounts Page", () => {
  before(() => {
    cy.login();
    cy.visit(`/accounts`);
  });

  it("Contains guidance for joining an existing service", () => {
    AccountsPage.Components.GuidanceJoinService().should("be.visible");
    AccountsPage.Components.DetailsJoinService().contains(
      "If you do not have an invitation",
    );
    AccountsPage.ExpandDetailsJoinService();
    AccountsPage.Components.DetailsJoinService()
      .find("p")
      .should("be.visible")
      .and(
        "contain",
        "Ask which team members have permission to invite you. If the team is unsure, from a GC Notify account visit the main menu and select “Team members.” That page:",
      );
    AccountsPage.Components.DetailsJoinService()
      .find("li")
      .should(
        "contain",
        "Includes an invitation button at the top of the page, if the member is permitted to send invitations.",
      )
      .should("be.visible");
    AccountsPage.Components.DetailsJoinService()
      .find("li")
      .should(
        "contain",
        "Includes an invitation button at the top of the page, if the member is permitted to send invitations.",
      )
      .and("be.visible");
  });
});
