/**
 * From header character count
 *
 * Shows a live "N characters remaining" / "N characters too many" count under the
 * service name and sending email address fields.
 *
 * AWS SES rejects a From header longer than 320 characters. The API sends:
 *   "=?utf-8?B?<base64 of the UTF-8 service name>?=" <email_from@sending_domain>
 * so the service name, email address and sending domain share one limit. This mirrors
 * get_from_header_length in app/main/validators.py, which remains the source of truth.
 *
 * Markup (rendered by components/from-header-character-count.html):
 *   <p data-module="from-header-character-count"
 *      data-counts="name|email_from"
 *      data-sending-domain="..."
 *      data-name-input="name"            (id of the name input, if it's on the page)
 *      data-service-name="..."           (current name, if the input isn't on the page)
 *      data-email-from-input="email_from" (id of the email input, if it's on the page)
 *      data-email-from="...">            (current email, if the input isn't on the page)
 */
(function () {
  "use strict";

  var MAX_FROM_HEADER_LENGTH = 320;
  var MAX_EMAIL_FROM_LENGTH = 64;
  // '"=?utf-8?B?' + '?=" <' + '@' + '>'
  var FIXED_HEADER_CHARACTERS = 11 + 5 + 1 + 1;

  function utf8ByteLength(value) {
    var bytes = 0;
    for (var char of value) {
      var codePoint = char.codePointAt(0);
      if (codePoint < 0x80) bytes += 1;
      else if (codePoint < 0x800) bytes += 2;
      else if (codePoint < 0x10000) bytes += 3;
      else bytes += 4;
    }
    return bytes;
  }

  function encodedNameLength(serviceName) {
    return 4 * Math.ceil(utf8ByteLength(serviceName) / 3);
  }

  function maxNameBytes(emailFrom, sendingDomain) {
    var room =
      MAX_FROM_HEADER_LENGTH -
      FIXED_HEADER_CHARACTERS -
      emailFrom.length -
      sendingDomain.length;
    return Math.max(Math.floor(room / 4) * 3, 0);
  }

  function maxEmailFromLength(serviceName, sendingDomain) {
    var room =
      MAX_FROM_HEADER_LENGTH -
      FIXED_HEADER_CHARACTERS -
      encodedNameLength(serviceName) -
      sendingDomain.length;
    return Math.max(Math.min(MAX_EMAIL_FROM_LENGTH, room), 0);
  }

  // Positive: characters left. Negative: characters to remove.
  // Letters with accents use 2 of the remaining characters, like on the server.
  function nameCharactersRemaining(serviceName, emailFrom, sendingDomain) {
    return maxNameBytes(emailFrom, sendingDomain) - utf8ByteLength(serviceName);
  }

  function emailFromCharactersRemaining(serviceName, emailFrom, sendingDomain) {
    return maxEmailFromLength(serviceName, sendingDomain) - emailFrom.length;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      utf8ByteLength: utf8ByteLength,
      nameCharactersRemaining: nameCharactersRemaining,
      emailFromCharactersRemaining: emailFromCharactersRemaining,
    };
  }

  if (typeof document === "undefined") return;

  function phrase(key, fallback) {
    return (window.APP_PHRASES && window.APP_PHRASES[key]) || fallback;
  }

  // The server cleans the email address with email_safe before validating it
  function emailSafe(value) {
    return window.utils && window.utils.emailSafe
      ? window.utils.emailSafe(value)
      : value;
  }

  function message(remaining) {
    if (remaining === 1) {
      return phrase("from_header_remaining_one", "1 character remaining");
    }
    if (remaining >= 0) {
      return phrase("from_header_remaining", "{} characters remaining").replace(
        "{}",
        remaining,
      );
    }
    if (remaining === -1) {
      return phrase("from_header_over_one", "1 character too many");
    }
    return phrase("from_header_over", "{} characters too many").replace(
      "{}",
      -remaining,
    );
  }

  function initCounter(counter) {
    var counts = counter.getAttribute("data-counts");
    var sendingDomain = counter.getAttribute("data-sending-domain") || "";
    var nameInput = document.getElementById(
      counter.getAttribute("data-name-input") || "",
    );
    var emailFromInput = document.getElementById(
      counter.getAttribute("data-email-from-input") || "",
    );
    var fixedServiceName = counter.getAttribute("data-service-name") || "";
    var fixedEmailFrom = counter.getAttribute("data-email-from") || "";

    if (!sendingDomain || (!nameInput && !emailFromInput)) return;

    function update() {
      var serviceName = nameInput ? nameInput.value : fixedServiceName;
      var emailFrom = emailSafe(
        emailFromInput ? emailFromInput.value : fixedEmailFrom,
      );
      var remaining =
        counts === "email_from"
          ? emailFromCharactersRemaining(serviceName, emailFrom, sendingDomain)
          : nameCharactersRemaining(serviceName, emailFrom, sendingDomain);

      counter.textContent = message(remaining);
      if (remaining < 0) {
        counter.classList.add("text-red-700", "font-bold");
      } else {
        counter.classList.remove("text-red-700", "font-bold");
      }
    }

    // Debounce so screen readers aren't sent an update on every keystroke
    var debounceTimer;
    function debouncedUpdate() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(update, 150);
    }

    [nameInput, emailFromInput].forEach(function (input) {
      if (input) {
        input.addEventListener("input", debouncedUpdate);
        input.addEventListener("change", debouncedUpdate);
      }
    });

    update();
  }

  var counters = document.querySelectorAll(
    '[data-module="from-header-character-count"]',
  );
  for (var i = 0; i < counters.length; i++) {
    initCounter(counters[i]);
  }
})();
