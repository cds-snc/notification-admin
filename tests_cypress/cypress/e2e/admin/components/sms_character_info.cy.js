import SmsCharacterInfo from "../../../Notify/Admin/Components/SmsCharacterInfo";

const { Components, URL } = SmsCharacterInfo;

// ── GSM-7 (ASCII) test strings ──────────────────────────────────────────────
// The storybook uses an empty prefix, so character counts are exact.
// GSM-7 single fragment limit: 160 chars. Multi-fragment: ceil(n / 153).
const GSM_1_PART = "a".repeat(160); // 160 / 160 → 1 part
const GSM_2_PARTS = "a".repeat(161); // ceil(161 / 153) = 2 parts
const GSM_3_PARTS = "a".repeat(307); // ceil(307 / 153) = ceil(2.007) = 3 parts
const GSM_4_PARTS = "a".repeat(460); // ceil(460 / 153) = ceil(3.007) = 4 parts

// ── Unicode (non-GSM) test strings ──────────────────────────────────────────
// "ë" is a French non-GSM character that triggers Unicode (UCS-2) encoding.
// Unicode single fragment limit: 70 chars. Multi-fragment: ceil(n / 67).
const UNICODE_1_PART = "ë".repeat(70); // 70 / 70 → 1 part
const UNICODE_2_PARTS = "ë".repeat(71); // ceil(71 / 67) = 2 parts
const UNICODE_3_PARTS = "ë".repeat(135); // ceil(135 / 67) = ceil(2.015) = 3 parts
const UNICODE_4_PARTS = "ë".repeat(202); // ceil(202 / 67) = ceil(3.015) = 4 parts
// Note: 201 chars = 67 × 3 exactly → ceil(201/67) = 3, not 4; hence 202 for 4 parts.

// ── Variable placeholder string ──────────────────────────────────────────────
const TEXT_WITH_PLACEHOLDER = "Hello ((name)), your appointment is confirmed.";
const SHORT_TEXT = "Hello world";

describe("SMS Character Info component", () => {
  beforeEach(() => {
    cy.visit(URL);
  });

  describe("Initial state", () => {
    it("shows the sms character info panel", () => {
      Components.Root().should("be.visible");
    });

    it("shows an initial fragment count on page load", () => {
      Components.FragmentCountText().should("not.be.empty");
    });

    it("shows the carrier info paragraph", () => {
      Components.CarrierInfo()
        .should("be.visible")
        .and(
          "contain.text",
          "Phone carriers count some texts as more than one message.",
        );
    });

    it("shows the guide link that opens in a new tab", () => {
      Components.GuideLink()
        .should("be.visible")
        .and("contain.text", "Guide: Counting text messages")
        .and("have.attr", "target", "_blank");
    });

    it("shows the daily text message limit", () => {
      Components.DailyLimit()
        .should("be.visible")
        .and("contain.text", "1,000")
        .and("contain.text", "is your daily text message limit");
    });
  });

  describe("GSM-7 fragment count (exact, no variables)", () => {
    it("shows '1 text message.' for 160 GSM chars (1 part)", () => {
      SmsCharacterInfo.typeContent(GSM_1_PART);
      Components.FragmentCountText().should("have.text", "1 text message.");
    });

    it("shows '2 text messages.' for 161 GSM chars (2 parts)", () => {
      SmsCharacterInfo.typeContent(GSM_2_PARTS);
      Components.FragmentCountText().should("have.text", "2 text messages.");
    });

    it("shows '3 text messages.' for 307 GSM chars (3 parts)", () => {
      SmsCharacterInfo.typeContent(GSM_3_PARTS);
      Components.FragmentCountText().should("have.text", "3 text messages.");
    });

    it("shows '4 text messages.' for 460 GSM chars (4 parts)", () => {
      SmsCharacterInfo.typeContent(GSM_4_PARTS);
      Components.FragmentCountText().should("have.text", "4 text messages.");
    });
  });

  describe("Unicode fragment count (exact, no variables)", () => {
    it("shows '1 text message.' for 70 Unicode chars (1 part)", () => {
      SmsCharacterInfo.typeContent(UNICODE_1_PART);
      Components.FragmentCountText().should("have.text", "1 text message.");
    });

    it("shows '2 text messages.' for 71 Unicode chars (2 parts)", () => {
      SmsCharacterInfo.typeContent(UNICODE_2_PARTS);
      Components.FragmentCountText().should("have.text", "2 text messages.");
    });

    it("shows '3 text messages.' for 135 Unicode chars (3 parts)", () => {
      SmsCharacterInfo.typeContent(UNICODE_3_PARTS);
      Components.FragmentCountText().should("have.text", "3 text messages.");
    });

    it("shows '4 text messages.' for 202 Unicode chars (4 parts)", () => {
      SmsCharacterInfo.typeContent(UNICODE_4_PARTS);
      Components.FragmentCountText().should("have.text", "4 text messages.");
    });
  });

  describe("Text changes when variables are present", () => {
    it("shows 'Estimate:' prefix when content contains a placeholder", () => {
      SmsCharacterInfo.typeContent(TEXT_WITH_PLACEHOLDER);
      Components.FragmentCountText().should("contain.text", "Estimate:");
    });

    it("shows variables warning suffix when content contains a placeholder", () => {
      SmsCharacterInfo.typeContent(TEXT_WITH_PLACEHOLDER);
      Components.FragmentCountSuffix().should(
        "contain.text",
        "Variables may increase number of messages.",
      );
    });

    it("does not show 'Estimate:' prefix or warning when content has no placeholders", () => {
      SmsCharacterInfo.typeContent(SHORT_TEXT);
      Components.FragmentCountText().should("not.contain.text", "Estimate:");
      Components.FragmentCountSuffix().should("have.text", "");
    });
  });
});
