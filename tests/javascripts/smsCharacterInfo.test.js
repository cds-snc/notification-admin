const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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

