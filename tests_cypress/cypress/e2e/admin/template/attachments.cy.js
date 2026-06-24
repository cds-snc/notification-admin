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

    Page.SelectTemplateById(CYPRESS_SERVICE_ID, EMAIL_TEMPLATE_ID);
    Page.Components.AttachmentsWidget().should("be.visible");
    scanCurrentState();

    Page.OpenAttachmentsModal();
    scanCurrentState();

    Page.AttachFile(attachmentFileName);

    Page.Components.AttachmentsList({ timeout: 10000 })
      .contains(attachmentFileName)
      .should("exist");
    scanCurrentState();

    cy.intercept("POST", "**/attachments/remove/**").as("removeAttachment");
    Page.RemoveAttachedFile(attachmentFileName);
    cy.wait("@removeAttachment").its("response.statusCode").should("eq", 204);

    Page.Components.AttachmentsList().should("not.exist");

    scanCurrentState();
  });
});
