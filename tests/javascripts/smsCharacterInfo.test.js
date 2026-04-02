const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const helpers = require("./support/helpers.js");

// Locate the CSV via the installed notifications_utils Python package
const notificationsUtilsDir = execSync(
  'python3 -c "import notifications_utils, os; print(os.path.dirname(notifications_utils.__file__))"'
)
  .toString()
  .trim();

// Load shared fragment count test cases from notification-utils
const smsFragmentTestCases = fs
  .readFileSync(path.join(notificationsUtilsDir, "sms_fragment_count_cases.csv"), "utf8")
  .trim()
  .split("\n")
  .slice(1) // skip header row
  .map((line) => {
    // The CSV uses quoted fields; the content field may be long.
    // Parse manually: last comma-separated token is expected_fragments.
    const lastComma = line.lastIndexOf(",");
    const sms_content = line.slice(0, lastComma).replace(/^"|"$/g, "").replace(/""/g, '"');
    const expected_fragments = parseInt(line.slice(lastComma + 1));
    return { sms_content, expected_fragments };
  });

// Minimal DOM structure mirroring the sms-character-info macro
function buildDOM({ prefix = "", initialContent = "", limit = "612" } = {}) {
  document.body.innerHTML = `
    <div
      id="sms-character-info"
      data-sms-prefix="${prefix}"
      data-sms-char-count-limit="${limit}"
      data-testid="sms-character-info"
    >
      <p id="sms-fragment-count">
        <strong id="sms-fragment-count-text"></strong>
        <span id="sms-fragment-count-suffix"></span>
      </p>
      <p id="sms-character-count">
        <span id="sms-character-count-text"></span>
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
    sms_estimate: "Estimate: {} text message parts.",
    sms_estimate_one: "Estimate: 1 text message part.",
    sms_variables_warning: "Variables may increase number of messages.",
    sms_count: "Total: {} text message parts.",
    sms_one: "Total: 1 text message part.",
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
  test("shows '1 text message part.' for an empty textarea", () => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Total: 1 text message part.");
    expect(
      document.getElementById("sms-fragment-count-suffix").textContent
    ).toBe("");
  });

  test("doesn't show character count for empty textarea and no prefix", () => {
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    expect(
      document.getElementById("sms-character-count-text").textContent
    ).toBe("");
  });
});

// ── Character count and limit validation ─────────────────────────────────────

describe("Character count and limit validation", () => {
  let textarea;
  let characterCountText;

  beforeEach(() => {
    buildDOM({ limit: "160" });
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    textarea = document.getElementById("template_content");
    characterCountText = document.getElementById("sms-character-count-text");
  });

  test("shows nothing when exactly at the limit", () => {
    // Due to #BUG in script, it uses content.length instead of characterUnits for limit check
    typeIntoTextarea(textarea, "a".repeat(160));
    expect(characterCountText.textContent).toBe("");
  });

  test("shows '1 too many character' when 1 over the limit", () => {
    // Due to #BUG in script, it uses content.length instead of characterUnits for limit check
    typeIntoTextarea(textarea, "a".repeat(161));
    expect(characterCountText.textContent).toBe("1 too many character");
    expect(characterCountText.classList.contains("text-red-700")).toBe(true);
  });

  test("shows 'N too many characters' when more than 1 over the limit", () => {
    // Due to #BUG in script, it uses content.length instead of characterUnits for limit check
    typeIntoTextarea(textarea, "a".repeat(165));
    expect(characterCountText.textContent).toBe("5 too many characters");
    expect(characterCountText.classList.contains("text-red-700")).toBe(true);
  });

  test("limit calculation currently ignores prefix due to script #BUG", () => {
    // Rebuild with 10-char prefix (8 chars + ": ")
    document.body.innerHTML = "";
    jest.resetModules();
    buildDOM({ prefix: "Service1", limit: "15" }); // "Service1: " is 10 chars.
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    const ta = document.getElementById("template_content");
    const label = document.getElementById("sms-character-count-text");

    // The script uses content.length, so it ignores the 10-char prefix
    // 15 chars (matching the limit)
    typeIntoTextarea(ta, "a".repeat(15));
    expect(label.textContent).toBe("");

    // 16 chars (1 over)
    typeIntoTextarea(ta, "a".repeat(16));
    expect(label.textContent).toBe("1 too many character");
  });

  test("limit calculation currently ignores GSM extension unit costs due to script #BUG", () => {
    // '[' is 2 units in GSM, but script uses .length
    typeIntoTextarea(textarea, "a".repeat(159) + "[");
    // length is 160 (at limit)
    expect(characterCountText.textContent).toBe("");

    typeIntoTextarea(textarea, "a".repeat(160) + "[");
    // length is 161 (1 over)
    expect(characterCountText.textContent).toBe("1 too many character");
  });
});

// ── Fragment count (shared CSV test cases) ───────────────────────────────────

describe("Fragment count (shared CSV test cases)", () => {
  let hasUnicodeChars, countCharacterUnits, getFragmentCount;

  beforeAll(() => {
    // Load the exported pure functions. The module.exports block is placed
    // before the DOM guard in smsCharacterInfo.js so this works without a DOM.
    ({ hasUnicodeChars, countCharacterUnits, getFragmentCount } = require(
      "../../app/assets/javascripts/smsCharacterInfo.js",
    ));
  });

  smsFragmentTestCases.forEach(({ sms_content, expected_fragments }) => {
    const label = sms_content.length > 40 ? sms_content.slice(0, 40) + "…" : sms_content;
    test(`"${label}" → ${expected_fragments} fragment(s)`, () => {
      const isUnicode = hasUnicodeChars(sms_content);
      const units = countCharacterUnits(sms_content, isUnicode);
      expect(getFragmentCount(units, isUnicode)).toBe(expected_fragments);
    });
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
    ).toBe("Total: 2 text message parts.");
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
    ).toBe("Total: 1 text message part.");
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
    expect(text).toBe("Total: 1 text message part.");
  });

  test("text with ((variable)) shows 'Estimate:' prefix", () => {
    typeIntoTextarea(textarea, "Hello ((name))");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Estimate: 1 text message part.");
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
    ).toBe("Estimate: 1 text message part.");
  });

  test("fallback placeholder syntax ((variable??fallback)) is also stripped", () => {
    typeIntoTextarea(textarea, "Hi ((name??there)), your ref is ((ref??unknown))");
    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Estimate: 1 text message part.");
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
    expect(fragmentCountText.textContent).toBe("Total: 1 text message part.");

    typeIntoTextarea(textarea, "a".repeat(161));
    expect(fragmentCountText.textContent).toBe("Total: 2 text message parts.");

    typeIntoTextarea(textarea, "a".repeat(307));
    expect(fragmentCountText.textContent).toBe("Total: 3 text message parts.");

    typeIntoTextarea(textarea, "a".repeat(10));
    expect(fragmentCountText.textContent).toBe("Total: 1 text message part.");
  });

  test("count does not change before debounce delay elapses", () => {
    textarea.value = "a".repeat(161);
    helpers.triggerEvent(textarea, "input");
    // Do NOT advance timers — debounce hasn't fired yet
    expect(fragmentCountText.textContent).toBe("Total: 1 text message part."); // still initial
  });

  test("count updates after debounce delay elapses", () => {
    textarea.value = "a".repeat(161);
    helpers.triggerEvent(textarea, "input");
    jest.advanceTimersByTime(150);
    expect(fragmentCountText.textContent).toBe("Total: 2 text message parts.");
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
      sms_count: "Total: {} text message parts.",
      sms_one: "Total: 1 text message part.",
    };
  });

  test("uses translated string from APP_PHRASES for single fragment", () => {
    window.APP_PHRASES.sms_one = "Total&nbsp;: 1 partie de message texte.";
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Total&nbsp;: 1 partie de message texte.");
  });

  test("uses translated string from APP_PHRASES for multiple fragments", () => {
    window.APP_PHRASES.sms_count = "Total&nbsp;: {} parties de messages texte.";
    buildDOM();
    require("../../app/assets/javascripts/smsCharacterInfo.js");
    const textarea = document.getElementById("template_content");
    typeIntoTextarea(textarea, "a".repeat(161));

    expect(
      document.getElementById("sms-fragment-count-text").textContent
    ).toBe("Total&nbsp;: 2 parties de messages texte.");
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
