import SmsCharacterInfo from "../../../Notify/Admin/Components/SmsCharacterInfo";

const { Components, URL, URL_WITH_PREFIX } = SmsCharacterInfo;

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

    it("plain text shows count without 'Estimate:' prefix", () => {
      SmsCharacterInfo.typeContent("Hello world");
      const text = Components.FragmentCountText().invoke("text");
      text.should(($el) => {
        expect($el).not.to.contain("Estimate:");
        expect($el).to.equal("1 text message.");
      });
    });

    it("placeholder is stripped before counting characters", () => {
      // If placeholders were counted: 150 chars of "a" + " ((name))" = ~160 chars → 1 fragment
      // With placeholders stripped: 150 chars + " " = 151 chars → still 1 fragment without placeholder
      // Need enough content that would push over the 160 limit if placeholder was counted
      // 150 "a"s + " " + "((name??Placeholder))" = ~170+ if not stripped → 2 fragments
      // But 151 chars = 1 fragment when stripped
      SmsCharacterInfo.typeContent("a".repeat(151) + " ((name??Placeholder))");
      Components.FragmentCountText().should(
        "have.text",
        "Estimate: 1 text message.",
      );
    });

    it("fallback placeholder syntax ((variable??fallback)) is also stripped", () => {
      // Similar logic: content that would be 2+ fragments if placeholders counted, but 1 if stripped
      // "a".repeat(155) + " ((name??there))" + " ((ref??unknown))" = ~185+ if not stripped → 2 fragments (ceil(185/153)=2)
      // But with stripping: 155 + " " + " " = 157 chars → still 1 fragment
      SmsCharacterInfo.typeContent(
        "a".repeat(155) + " ((name??there)) ((ref??unknown))",
      );
      Components.FragmentCountText().should(
        "have.text",
        "Estimate: 1 text message.",
      );
      Components.FragmentCountSuffix().should(
        "contain.text",
        "Variables may increase number of messages.",
      );
    });
  });

  describe("Service prefix included in character count", () => {
    beforeEach(() => {
      cy.visit(URL_WITH_PREFIX);
    });

    it("shows '2 text messages.' when 152-char content plus 9-char prefix overhead = 161 units", () => {
      // NotifyBC prefix (7 chars) + ": " (2 chars) = 9 char overhead
      // 152 char content + 9 char overhead = 161 total units → 2 fragments
      SmsCharacterInfo.typeContent("a".repeat(152));
      Components.FragmentCountText().should("have.text", "2 text messages.");
    });

    it("shows '1 text message.' when content is short enough (prefix overhead hasn't pushed it to 2 fragments)", () => {
      // Small content like 140 chars + 9 char prefix = 149 total units → still 1 fragment
      SmsCharacterInfo.typeContent("a".repeat(140));
      Components.FragmentCountText().should("have.text", "1 text message.");
    });
  });

  describe("Live updates on input", () => {
    it("updates fragment count as content changes", () => {
      // Initially empty → 1 message
      Components.FragmentCountText().should("have.text", "1 text message.");

      // Type 161 chars → 2 messages
      SmsCharacterInfo.typeContent("a".repeat(161));
      Components.FragmentCountText().should("have.text", "2 text messages.");

      // Type 307 chars → 3 messages
      SmsCharacterInfo.typeContent("a".repeat(307));
      Components.FragmentCountText().should("have.text", "3 text messages.");

      // Type 10 chars → back to 1 message
      SmsCharacterInfo.typeContent("a".repeat(10));
      Components.FragmentCountText().should("have.text", "1 text message.");
    });
  });

  describe("Initial render on page load", () => {
    it("shows '1 text message.' for an empty textarea on page load", () => {
      Components.FragmentCountText().should("have.text", "1 text message.");
      Components.FragmentCountSuffix().should("have.text", "");
    });
  });
});
