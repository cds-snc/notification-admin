const helpers = require("./support/helpers.js");

const SCRIPT = "../../app/assets/javascripts/fromHeaderCharacterCount.js";
const SENDING_DOMAIN = "notify.example.com";

function counterMarkup({ counts, nameInput = true, emailFromInput = true, serviceName = "", emailFrom = "" }) {
  return `
    <p id="${counts}-character-count"
       data-module="from-header-character-count"
       data-counts="${counts}"
       data-sending-domain="${SENDING_DOMAIN}"
       ${nameInput ? 'data-name-input="name"' : `data-service-name="${serviceName}"`}
       ${emailFromInput ? 'data-email-from-input="email_from"' : `data-email-from="${emailFrom}"`}></p>`;
}

// Mirrors the create service page: both fields with a count under each
function buildCreateServiceDOM({ name = "", emailFrom = "" } = {}) {
  document.body.innerHTML = `
    <input id="name" value="${name}">
    ${counterMarkup({ counts: "name" })}
    <input id="email_from" value="${emailFrom}">
    ${counterMarkup({ counts: "email_from" })}`;
}

function nameCount() {
  return document.getElementById("name-character-count");
}

function emailFromCount() {
  return document.getElementById("email_from-character-count");
}

function type(input, value) {
  input.value = value;
  helpers.triggerEvent(input, "input");
  jest.advanceTimersByTime(150);
}

beforeAll(() => {
  jest.useFakeTimers();
  window.APP_PHRASES = {
    from_header_remaining: "{} characters remaining",
    from_header_remaining_one: "1 character remaining",
    from_header_over: "{} characters too many",
    from_header_over_one: "1 character too many",
  };
});

afterAll(() => {
  require("./support/teardown.js");
});

afterEach(() => {
  document.body.innerHTML = "";
  delete window.utils;
  jest.resetModules();
});

// The expected values below match tests/app/main/test_validators.py, which checks
// the same calculation on the server:
// '"=?utf-8?B?' (11) + base64 name + '?=" <' (5) + email_from + '@' + domain + '>'

describe("Calculation", () => {
  const { utf8ByteLength, nameCharactersRemaining, emailFromCharactersRemaining } = require(SCRIPT);

  test.each([
    ["abc", 3],
    ["é", 2],
    ["’", 3],
    ["😀", 4],
  ])("utf8ByteLength(%s) is %i", (value, expected) => {
    expect(utf8ByteLength(value)).toBe(expected);
  });

  test.each([
    // name, email_from, expected name characters remaining
    ["a".repeat(204), "b".repeat(10), 0], // 318
    ["a".repeat(205), "b".repeat(10), -1], // 322
    ["é".repeat(102), "b".repeat(10), 0], // 204 bytes, 318
    ["é".repeat(103), "b".repeat(10), -2], // 206 bytes, 322
    ["a".repeat(200), "b".repeat(20), -2], // 324
    ["", "abc", 210],
  ])("name %#", (name, emailFrom, expected) => {
    expect(nameCharactersRemaining(name, emailFrom, SENDING_DOMAIN)).toBe(expected);
  });

  test.each([
    // name, email_from, expected email characters remaining
    ["a".repeat(200), "", 16],
    ["a".repeat(200), "b".repeat(20), -4], // 324
    ["é".repeat(100), "", 16],
    ["Sample service", "", 64], // never more than the 64 character limit
    ["Sample service", "b".repeat(65), -1],
  ])("email_from %#", (name, emailFrom, expected) => {
    expect(emailFromCharactersRemaining(name, emailFrom, SENDING_DOMAIN)).toBe(expected);
  });
});

describe("Guard conditions", () => {
  test("does nothing when there is no counter on the page", () => {
    document.body.innerHTML = `<input id="name">`;
    expect(() => require(SCRIPT)).not.toThrow();
  });

  test("does nothing when the counter's inputs are missing", () => {
    document.body.innerHTML = counterMarkup({ counts: "name" });
    require(SCRIPT);
    expect(nameCount().textContent).toBe("");
  });
});

describe("Create service page", () => {
  test("shows the counts on page load", () => {
    buildCreateServiceDOM();
    require(SCRIPT);

    expect(nameCount().textContent).toBe("213 characters remaining");
    expect(emailFromCount().textContent).toBe("64 characters remaining");
  });

  test("updates both counts as the name is typed", () => {
    buildCreateServiceDOM({ emailFrom: "b".repeat(20) });
    require(SCRIPT);

    type(document.getElementById("name"), "a".repeat(195));

    expect(nameCount().textContent).toBe("3 characters remaining");
    expect(emailFromCount().textContent).toBe("4 characters remaining");
  });

  test("counts letters with accents as 2", () => {
    buildCreateServiceDOM({ emailFrom: "b".repeat(20) });
    require(SCRIPT);

    type(document.getElementById("name"), "a".repeat(196) + "é");

    expect(nameCount().textContent).toBe("0 characters remaining");
  });

  test("shows characters too many in red once over the limit", () => {
    buildCreateServiceDOM({ name: "a".repeat(200) });
    require(SCRIPT);

    type(document.getElementById("email_from"), "b".repeat(20));

    expect(nameCount().textContent).toBe("2 characters too many");
    expect(emailFromCount().textContent).toBe("4 characters too many");
    expect(nameCount().classList.contains("text-red-700")).toBe(true);

    type(document.getElementById("email_from"), "b".repeat(16));

    expect(emailFromCount().textContent).toBe("0 characters remaining");
    expect(nameCount().classList.contains("text-red-700")).toBe(false);
  });

  test("uses singular wording for 1 character", () => {
    buildCreateServiceDOM({ name: "a".repeat(200) });
    require(SCRIPT);

    type(document.getElementById("email_from"), "b".repeat(15));
    expect(emailFromCount().textContent).toBe("1 character remaining");

    type(document.getElementById("email_from"), "b".repeat(17));
    expect(emailFromCount().textContent).toBe("1 character too many");
  });

  test("counts the email address the way the server cleans it", () => {
    window.utils = { emailSafe: (value) => value.trim().toLowerCase().replace(/\s+/g, ".") };
    buildCreateServiceDOM({ name: "a".repeat(200) });
    require(SCRIPT);

    type(document.getElementById("email_from"), "  Abc  ");

    expect(emailFromCount().textContent).toBe("13 characters remaining");
  });

  test("waits for typing to pause before updating", () => {
    buildCreateServiceDOM();
    require(SCRIPT);
    const input = document.getElementById("name");

    input.value = "a".repeat(10);
    helpers.triggerEvent(input, "input");
    jest.advanceTimersByTime(100);
    expect(nameCount().textContent).toBe("213 characters remaining");

    jest.advanceTimersByTime(50);
    expect(nameCount().textContent).toBe("203 characters remaining");
  });
});

describe("Settings pages", () => {
  test("service name page uses the current email address", () => {
    document.body.innerHTML = `
      <input id="name" value="${"a".repeat(190)}">
      ${counterMarkup({ counts: "name", emailFromInput: false, emailFrom: "b".repeat(20) })}`;
    require(SCRIPT);

    expect(nameCount().textContent).toBe("8 characters remaining");
  });

  test("email address page uses the current service name", () => {
    document.body.innerHTML = `
      <input id="email_from" value="${"b".repeat(10)}">
      ${counterMarkup({ counts: "email_from", nameInput: false, serviceName: "a".repeat(200) })}`;
    require(SCRIPT);

    expect(emailFromCount().textContent).toBe("6 characters remaining");
  });
});
