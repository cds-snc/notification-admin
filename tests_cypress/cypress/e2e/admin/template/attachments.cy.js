/// <reference types="cypress" />

import Pages from "../../../Notify/Admin/Pages/all";
import { getServiceID, getTemplateID } from "../../../support/utils";

const Page = Pages.TemplatesPage;
const ServiceSettingsPage = Pages.ServiceSettingsPage;
const CYPRESS_SERVICE_ID = getServiceID("CYPRESS");
const EMAIL_TEMPLATE_ID = getTemplateID("SMOKE_TEST_EMAIL");
const TEMPLATE_VIEW_PATH = `/services/${CYPRESS_SERVICE_ID}/templates/${EMAIL_TEMPLATE_ID}`;
const TEST_ATTACHMENT_FILE_NAME = "smoke-test-attachment-e2e.png";

const scanCurrentState = () => {
  cy.a11yScan(false, {
    a11y: true,
    htmlValidate: false,
    deadLinks: false,
    mimeTypes: false,
    axeConfig: false,
  });
};

const setAllowFileAttachments = (enabled) => {
  ServiceSettingsPage.VisitFileAttachmentsSettingPage(CYPRESS_SERVICE_ID);
  ServiceSettingsPage.SetAllowFileAttachments(enabled);
  ServiceSettingsPage.SaveFileAttachmentsSetting();
  ServiceSettingsPage.Components.MessageBanner().contains("Setting updated");
};

const removeAttachmentIfPresent = (fileName) => {
  cy.visit(TEMPLATE_VIEW_PATH);

  cy.get("body").then(($body) => {
    if (!$body.find("[data-testid='attachments-list']").length) {
      return;
    }

    Page.Components.AttachmentsList().then(($list) => {
      if (!$list.text().includes(fileName)) {
        return;
      }

      cy.intercept("POST", "**/attachments/remove/**").as(
        "cleanupRemoveAttachment",
      );
      Page.RemoveAttachedFile(fileName);
      cy.wait("@cleanupRemoveAttachment")
        .its("response.statusCode")
        .should("eq", 204);
    });
  });
};

describe("Template attachments", () => {
  beforeEach(() => {
    cy.loginAsPlatformAdmin();
    setAllowFileAttachments(true);
    removeAttachmentIfPresent(TEST_ATTACHMENT_FILE_NAME);
    cy.visit(`/services/${CYPRESS_SERVICE_ID}/templates`);
  });

  afterEach(() => {
    // Keep baseline permission enabled for any dependent tests.
    setAllowFileAttachments(true);
    removeAttachmentIfPresent(TEST_ATTACHMENT_FILE_NAME);
  });

  it("shows and hides attachments widget based on Send files by email setting", () => {
    setAllowFileAttachments(false);

    cy.visit(TEMPLATE_VIEW_PATH);
    Page.Components.AttachmentsWidget().should("not.exist");

    setAllowFileAttachments(true);

    cy.visit(TEMPLATE_VIEW_PATH);
    Page.Components.AttachmentsWidget().should("be.visible");
  });

  it("attaches and removes a file on an existing template", () => {
    const attachmentFileName = TEST_ATTACHMENT_FILE_NAME;

    // Stub the DDAPI attachment upload endpoint before any actions
    cy.intercept("POST", "**/services/**/attachments", {
      statusCode: 200,
      body: [
        {
          "created_at": "2026-07-06T15:19:23.410059+00:00",
          "created_by": "e4c4c4c4-3a9b-4d8c-9b4f-8d3e5f9d8c7a",
          "document_id": "8c388368-f333-4b77-a885-76914d8e73ac",
          "file_size": 64,
          "id": "fd7c843b-db41-44d4-9b72-0654d45e03ef",
          "mime_type": "text/csv",
          "name": attachmentFileName,
          "service_id": "a1cf9c7a-3b04-4170-ba9b-65253270d150",
          "status": "pending_virus_scan",
          "template_id": "94ec88ba-15e7-4a6a-87dd-b4017d0d764f",
          "type": "template_attach",
          "updated_at": "2026-07-06T15:19:23.410065+00:00"
        }
      ],
    }).as("attachFile");

    // Stub the remove endpoint too
    cy.intercept("POST", "**/attachments/remove/**", {
      statusCode: 204,
    }).as("removeAttachment");

    Page.SelectTemplateById(CYPRESS_SERVICE_ID, EMAIL_TEMPLATE_ID);
    Page.Components.AttachmentsWidget().should("be.visible");
    scanCurrentState();

    Page.OpenAttachmentsModal();
    scanCurrentState();

    Page.AttachFile(attachmentFileName);
    cy.wait("@attachFile");

    Page.Components.AttachmentsList({ timeout: 10000 })
      .contains(attachmentFileName)
      .should("exist");
    scanCurrentState();

    Page.RemoveAttachedFile(attachmentFileName);
    cy.wait("@removeAttachment").its("response.statusCode").should("eq", 204);

    Page.Components.AttachmentsList().should("not.exist");

    scanCurrentState();
  });
});
