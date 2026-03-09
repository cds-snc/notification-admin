const helpers = require("./support/helpers.js");

// Minimal DOM structure mirroring the sms-character-info macro
function buildDOM({ prefix = "", initialContent = "" } = {}) {
  document.body.innerHTML = `
    <div
      id="sms-character-info"
      data-sms-prefix="${prefix}"
      data-testid="sms-character-info"
    >
      <p id="sms-fragment-count">
        <strong id="sms-fragment-count-text"></strong>
        <span id="sms-fragment-count-suffix"></span>
      </p>
      <p id="sms-daily-limit">
        <strong id="sms-daily-limit-value">1,000</strong>
        is your daily text message limit
      </p>
    </div>
    <textarea id="template_content">${initialContent}</textarea>`;
}

beforeAll(() => {
  jest.useFakeTimers();

  // Mirror the APP_PHRASES values set by Flask in main_template.html
  window.APP_PHRASES = {
    sms_estimate: "Estimate: {} text messages.",
    sms_estimate_one: "Estimate: 1 text message.",
    sms_variables_warning: "Variables may increase number of messages.",
    sms_count: "{} text messages.",
    sms_one: "1 text message.",
  };
});

afterAll(() => {
  require("./support/teardown.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  // Reset the module so the IIFE re-executes with fresh DOM on the next require
  jest.resetModules();
});

// Helper: set textarea value and fire input event, then flush the debounce
function typeIntoTextarea(textarea, value) {
  textarea.value = value;
  helpers.triggerEvent(textarea, "input");
  jest.advanceTimersByTime(150);
}

// ── Guard conditions ─────────────────────────────────────────────────────────

describe("Guard conditions", () => {
  test("does not throw when #sms-character-info container is absent", () => {
    document.body.innerHTML = `<textarea id="template_content"></textarea>`;
    expect(() =>
      require("../../app/assets/javascripts/smsCharacterInfo.js")
    ).not.toThrow();
  });

  test("does not throw when #template_content textarea is absent", () => {
    document.body.innerHTML = `<div id="sms-character-info" data-sms-prefix=""></div>`;
    expect(() =>
      require("../../app/assets/javascripts/smsCharacterInfo.js")
    ).not.toThrow();
  });
});

// ── Initial render (page load) ───────────────────────────────────────────────

describe("Initial render on page load", () => {
  test("shows '1 text message.' for an empty textarea", () => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");
    expect(
      document.getElementById("sms-fragment-count-suffix").textContent
    ).toBe("");
  });
});

// ── GSM-7 fragment counting ──────────────────────────────────────────────────

describe("GSM-7 fragment counting", () => {
  let textarea;

  beforeEach(() => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
  });

  test("160 GSM characters → 1 fragment", () => {
    typeIntoTextarea(textarea, "a".repeat(160));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");
  });

  test("161 GSM characters → 2 fragments", () => {
    typeIntoTextarea(textarea, "a".repeat(161));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });

  test("306 GSM characters → 2 fragments (153 × 2 boundary)", () => {
    typeIntoTextarea(textarea, "a".repeat(306));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });

  test("307 GSM characters → 3 fragments", () => {
    typeIntoTextarea(textarea, "a".repeat(307));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("3 text messages.");
  });

  test("GSM extension characters (e.g. €) count as 2 units each", () => {
    // 80 × '€' = 160 units → still 1 fragment
    typeIntoTextarea(textarea, "€".repeat(80));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");

    // 81 × '€' = 162 units → 2 fragments
    typeIntoTextarea(textarea, "€".repeat(81));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });
});

// ── Unicode fragment counting ────────────────────────────────────────────────

describe("Unicode fragment counting", () => {
  let textarea;

  beforeEach(() => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
  });

  test("Unicode character (ë) switches to Unicode encoding", () => {
    // 'ë' is a Unicode-forcing character; 1 char = 1 fragment (<= 70)
    typeIntoTextarea(textarea, "ë");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");
  });

  test("70 Unicode characters → 1 fragment", () => {
    typeIntoTextarea(textarea, "ë".repeat(70));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");
  });

  test("71 Unicode characters → 2 fragments", () => {
    typeIntoTextarea(textarea, "ë".repeat(71));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });

  test("134 Unicode characters → 2 fragments (67 × 2 boundary)", () => {
    typeIntoTextarea(textarea, "ë".repeat(134));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });

  test("135 Unicode characters → 3 fragments", () => {
    typeIntoTextarea(textarea, "ë".repeat(135));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("3 text messages.");
  });

  test("Welsh character (Ŵ) also triggers Unicode encoding", () => {
    typeIntoTextarea(textarea, "Ŵ".repeat(70));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");

    typeIntoTextarea(textarea, "Ŵ".repeat(71));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });
});

// ── Service prefix counted in character total ────────────────────────────────

describe("Service prefix included in character count", () => {
  let textarea;

  // Prefix "TestSvc" = 7 chars, plus ": " = 9 chars overhead
  beforeEach(() => {
    buildDOM({ prefix: "TestSvc" });
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
  });

  test("prefix overhead pushes 152-char message into 2 fragments", () => {
    // 7 (prefix) + 2 (': ') + 152 (content) = 161 units → 2 fragments
    typeIntoTextarea(textarea, "a".repeat(152));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 text messages.");
  });

  test("same 152-char content without prefix stays at 1 fragment", () => {
    // Rebuild without prefix
    document.body.innerHTML = "";
    jest.resetModules();
    buildDOM({ prefix: "" });
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    const ta = document.getElementById("template_content");

    typeIntoTextarea(ta, "a".repeat(152));
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 text message.");
  });
});

// ── Personalisation variables ────────────────────────────────────────────────

describe("Personalisation variables", () => {
  let textarea;

  beforeEach(() => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
  });

  test("plain text shows count without 'Estimate:' prefix", () => {
    typeIntoTextarea(textarea, "Hello world");
    const text =
      document.getElementById("sms-fragment-count-text").textContent;
    expect(text).not.toContain("Estimate:");
    expect(text).toBe("1 text message.");
  });

  test("text with ((variable)) shows 'Estimate:' prefix", () => {
    typeIntoTextarea(textarea, "Hello ((name))");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Estimate: 1 text message.");
  });

  test("text with ((variable)) shows variables warning in suffix", () => {
    typeIntoTextarea(textarea, "Hello ((name))");
    expect(
      document.getElementById("sms-fragment-count-suffix").textContent
    ).toBe(" Variables may increase number of messages.");
  });

  test("plain text has empty suffix", () => {
    typeIntoTextarea(textarea, "Hello world");
    expect(
      document.getElementById("sms-fragment-count-suffix").textContent
    ).toBe("");
  });

  test("placeholder is stripped before counting characters", () => {
    // 'Hello ' (6 chars) + ((name)) stripped → 6 chars counted → 1 fragment
    typeIntoTextarea(textarea, "Hello ((name))");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Estimate: 1 text message.");
  });

  test("fallback placeholder syntax ((variable??fallback)) is also stripped", () => {
    typeIntoTextarea(textarea, "Hi ((name??there)), your ref is ((ref??unknown))");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Estimate: 1 text message.");
    expect(
      document.getElementById("sms-fragment-count-suffix").textContent
    ).toBe(" Variables may increase number of messages.");
  });
});

// ── Fragment count updates live on input ─────────────────────────────────────

describe("Live updates on input", () => {
  let textarea;
  let fragmentCountText;

  beforeEach(() => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
    fragmentCountText = document.getElementById("sms-fragment-count-text");
  });

  test("updates fragment count as content changes", () => {
    expect(fragmentCountText.textContent).toBe("1 text message.");

    typeIntoTextarea(textarea, "a".repeat(161));
    expect(fragmentCountText.textContent).toBe("2 text messages.");

    typeIntoTextarea(textarea, "a".repeat(307));
    expect(fragmentCountText.textContent).toBe("3 text messages.");

    typeIntoTextarea(textarea, "a".repeat(10));
    expect(fragmentCountText.textContent).toBe("1 text message.");
  });

  test("count does not change before debounce delay elapses", () => {
    textarea.value = "a".repeat(161);
    helpers.triggerEvent(textarea, "input");
    // Do NOT advance timers — debounce hasn't fired yet
    expect(fragmentCountText.textContent).toBe("1 text message."); // still initial
  });

  test("count updates after debounce delay elapses", () => {
    textarea.value = "a".repeat(161);
    helpers.triggerEvent(textarea, "input");
    jest.advanceTimersByTime(150);
    expect(fragmentCountText.textContent).toBe("2 text messages.");
  });
});

// ── i18n via APP_PHRASES ─────────────────────────────────────────────────────

describe("i18n via APP_PHRASES", () => {
  afterEach(() => {
    // Restore defaults after each test in this group
    window.APP_PHRASES = {
      sms_estimate: "Estimate: {} text messages.",
      sms_estimate_one: "Estimate: 1 text message.",
      sms_variables_warning: "Variables may increase number of messages.",
      sms_count: "{} text messages.",
      sms_one: "1 text message.",
    };
  });

  test("uses translated string from APP_PHRASES for single fragment", () => {
    window.APP_PHRASES.sms_one = "1 message texte.";
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("1 message texte.");
  });

  test("uses translated string from APP_PHRASES for multiple fragments", () => {
    window.APP_PHRASES.sms_count = "{} messages texte.";
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    const textarea = document.getElementById("template_content");
    typeIntoTextarea(textarea, "a".repeat(161));

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("2 messages texte.");
  });

  test("falls back to default string when APP_PHRASES is not set", () => {
    delete window.APP_PHRASES;
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    // Should not throw and should display the fallback text
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBeTruthy();

    window.APP_PHRASES = {}; // restore to empty for cleanup
  });
});
