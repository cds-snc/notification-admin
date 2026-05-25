/// <reference types="cypress" />
import Attachments from "../../../Notify/Admin/Components/Attachments";

const { Components, URL } = Attachments;

describe("Attachments component", () => {
  beforeEach(() => {
    cy.visit(URL);
  });

  it("attaches a valid file and transitions to attached state", () => {
    Attachments.openModal("attachments-empty");

    Attachments.selectFiles({
      contents: Cypress.Buffer.from("smoke-test-content"),
      fileName: "smoke-test-file.pdf",
      mimeType: "application/pdf",
    });

    Attachments.submitModal();

    Components.List("attachments-empty")
      .contains("smoke-test-file.pdf")
      .should("exist");
    Components.Summary("attachments-empty").should(
      "not.contain.text",
      "No files attached",
    );
    Components.Summary("attachments-empty", { timeout: 6000 }).should(
      ($summary) => {
        const summaryText = $summary.text();
        expect(summaryText).to.match(/attached|joints/i);
      },
    );
  });

  it("shows malware and failed outcomes in interactive simulation", () => {
    Attachments.openModal("attachments-interactive");

    Attachments.selectFiles([
      {
        contents: Cypress.Buffer.from("infected"),
        fileName: "document_with_malware.pdf",
        mimeType: "application/pdf",
      },
      {
        contents: Cypress.Buffer.from("error-file"),
        fileName: "upload_error.csv",
        mimeType: "text/csv",
      },
    ]);

    Attachments.submitModal();

    Components.List("attachments-interactive", { timeout: 6000 })
      .contains("document_with_malware.pdf")
      .should("exist");
    Components.List("attachments-interactive")
      .contains("upload_error.csv")
      .should("exist");
    Components.MalwareMessage("attachments-interactive").should("be.visible");
    Components.Summary("attachments-interactive").should(($summary) => {
      const summaryText = $summary.text();
      expect(summaryText).to.match(/not attached|non-joint/i);
    });
  });

  it("supports remove confirmation flow", () => {
    Components.List("attachments-malware")
      .contains("safe_permit.pdf")
      .should("exist");
    Attachments.removeByFilename("attachments-malware", "safe_permit.pdf");
    Attachments.confirmRemove();
    Components.List("attachments-malware")
      .contains("safe_permit.pdf")
      .should("not.exist");
  });

  it("closes modal with Escape and keeps focus in modal while open", () => {
    Attachments.openModal("attachments-empty");

    Components.Modal().should("be.visible");
    cy.get("body").click(0, 0);
    cy.focused().closest('[data-testid="attachments-modal"]').should("exist");

    Attachments.pressEscape();
    Components.Modal().should("not.exist");
  });
});
