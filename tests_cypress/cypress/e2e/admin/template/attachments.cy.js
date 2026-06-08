/// <reference types="cypress" />

import Pages from "../../../Notify/Admin/Pages/all";
import { getServiceID, getTemplateID } from "../../../support/utils";

const Page = Pages.TemplatesPage;
const CYPRESS_SERVICE_ID = getServiceID("CYPRESS");
const EMAIL_TEMPLATE_ID = getTemplateID("SMOKE_TEST_EMAIL");

const scanCurrentState = () => {
  cy.a11yScan(false, {
    a11y: true,
    htmlValidate: false,
    deadLinks: false,
    mimeTypes: false,
    axeConfig: false,
  });
};

describe("Template attachments", () => {
  beforeEach(() => {
    cy.loginAsPlatformAdmin();
    cy.visit(`/services/${CYPRESS_SERVICE_ID}/templates`);
  });

  it("attaches and removes a file on an existing template", () => {
    const attachmentFileName = `smoke-test-attachment-${Date.now()}.png`;

    Page.SelectTemplateById(CYPRESS_SERVICE_ID, EMAIL_TEMPLATE_ID);
    Page.Components.AttachmentsWidget().should("be.visible");
    scanCurrentState();

    Page.OpenAttachmentsModal();
    scanCurrentState();

    Page.AttachFile(attachmentFileName);

    Page.Components.AttachmentsList({ timeout: 10000 })
      .contains(attachmentFileName)
      .should("exist");
    cy.getByTestId("attachment-row-spinner", { timeout: 10000 }).should(
      "not.exist",
    );
    scanCurrentState();

    cy.intercept("POST", "**/attachments/remove/**").as("removeAttachment");
    Page.RemoveAttachedFile(attachmentFileName);
    cy.wait("@removeAttachment").its("response.statusCode").should("eq", 204);

    Page.Components.AttachmentsList().should("not.exist");

    scanCurrentState();
  });
});
