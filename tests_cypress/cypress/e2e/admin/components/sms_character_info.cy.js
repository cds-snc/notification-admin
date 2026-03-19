import SmsCharacterInfo from "../../../Notify/Admin/Components/SmsCharacterInfo";

const { Components, URL } = SmsCharacterInfo;

// ── GSM-7 (ASCII) test strings ──────────────────────────────────────────────
// The storybook uses an empty prefix, so character counts are exact.
// GSM-7 single fragment limit: 160 chars. Multi-fragment: ceil(n / 153).
const GSM_1_PART = "a".repeat(160); // 160 / 160 → 1 part

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
          "Phone carriers count some messages as multiple text message parts.",
        );
    });

    it("shows the guide link that opens in a new tab", () => {
      Components.GuideLink()
        .should("be.visible")
        .and("contain.text", "Guide: Counting text message parts")
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
    it("shows '1' for 160 GSM chars (1 part)", () => {
      SmsCharacterInfo.typeContent(GSM_1_PART);
      Components.FragmentCountText().should("have.text", "1 text message part");
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
