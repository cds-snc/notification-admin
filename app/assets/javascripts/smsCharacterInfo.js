/**
 * SMS Character Info Component
 *
 * Displays live SMS fragment count estimate below the template content textarea
 * on the SMS template edit/add pages.
 *
 * This component listens to `input` events on the #template_content textarea and
 * updates text content in pre-existing HTML elements:
 *   1. #sms-fragment-count-text — "Estimate: N text messages."
 *   2. #sms-fragment-count-suffix — "Variables may increase number of messages." (if placeholders present)
 *
 * All markup lives in the Jinja template; this script only updates text and visibility.
 * Localisation follows the window.APP_PHRASES pattern used by other components.
 */
(function () {
  "use strict";

  // ── GSM 03.38 Basic Character Set ──────────────────────────────────────
  // Standard GSM-7 characters (each costs 1 unit)
  var GSM_BASIC_CHARS =
    "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ!\"#¤%&'()*+,-./0123456789:;<=>?" +
    "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

  // GSM extension characters (each costs 2 units due to escape byte)
  var GSM_EXTENSION_CHARS = "^{}\\[~]|€";

  // Welsh non-GSM characters that force Unicode (UCS-2) encoding
  var WELSH_NON_GSM = "ÂâÊêÎîÔôÛûŴŵŶŷ";

  // French non-GSM characters that force Unicode encoding
  var FRENCH_NON_GSM = "ÀÂËÎÏÔÙÛâçêëîïôûŒœ";

  // All non-GSM characters that are allowed but force Unicode encoding
  var ALL_NON_GSM_ALLOWED = WELSH_NON_GSM + FRENCH_NON_GSM;

  // Build sets for fast lookup
  var gsmBasicSet = new Set(GSM_BASIC_CHARS);
  var gsmExtensionSet = new Set(GSM_EXTENSION_CHARS);
  var nonGsmAllowedSet = new Set(ALL_NON_GSM_ALLOWED);

  // Full GSM set (basic + extension)
  var fullGsmSet = new Set(GSM_BASIC_CHARS + GSM_EXTENSION_CHARS);

  // ── Placeholder pattern ─────────────────────────────────────────────────
  // Matches ((variable)) or ((variable??fallback)) patterns.
  // Defined here (before the DOM guard) so stripped is correct when the exported
  // pure functions are called in unit tests without a real DOM.
  var placeholderPattern = /\(\(([^)(]+?)(\?\?[^)(]*)?\)\)/g;

  // ── Core SMS counting logic ─────────────────────────────────────────────

  /**
   * Check if the content contains any characters that force Unicode encoding.
   * Matches the Python `is_unicode` check from notifications_utils.
   * Placeholders like ((name)) are stripped before checking, matching Python behaviour.
   */
  function hasUnicodeChars(text) {
    var stripped = stripPlaceholders(text);
    for (var i = 0; i < stripped.length; i++) {
      if (nonGsmAllowedSet.has(stripped[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Count the number of character units in the text.
   * - In GSM mode: basic chars = 1 unit, extension chars = 2 units
   * - In Unicode mode: each character = 1 unit
   * Placeholders like ((name)) are stripped before counting, matching Python behaviour.
   */
  function countCharacterUnits(text, isUnicode) {
    var stripped = stripPlaceholders(text);
    if (isUnicode) {
      return stripped.length;
    }
    var count = 0;
    for (var i = 0; i < stripped.length; i++) {
      if (gsmExtensionSet.has(stripped[i])) {
        count += 2;
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Calculate the SMS fragment count.
   * GSM: 1 fragment if <= 160 units, else ceil(units / 153)
   * Unicode: 1 fragment if <= 70 units, else ceil(units / 67)
   */
  function getFragmentCount(characterUnits, isUnicode) {
    if (isUnicode) {
      return characterUnits <= 70 ? 1 : Math.ceil(characterUnits / 67);
    }
    return characterUnits <= 160 ? 1 : Math.ceil(characterUnits / 153);
  }

  // Export pure functions for unit testing in Node/Jest environments
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      hasUnicodeChars: hasUnicodeChars,
      countCharacterUnits: countCharacterUnits,
      getFragmentCount: getFragmentCount,
    };
  }

  var container = document.getElementById("sms-character-info");
  if (!container) return;

  var textarea = document.getElementById("template_content");
  if (!textarea) return;

  // ── DOM references ──────────────────────────────────────────────────────
  var fragmentCountText = document.getElementById("sms-fragment-count-text");
  var fragmentCountSuffix = document.getElementById(
    "sms-fragment-count-suffix",
  );
      var characterCountText = document.getElementById(
      "sms-character-count-text",
    );
  // Shortening suggestions DOM references (commented out — preserved for future use)
  // var shortenSection = document.getElementById("sms-shorten-suggestions");
  // var shortenList = document.getElementById("sms-shorten-list");

  // Bail if the markup is missing
  if (!fragmentCountText || !fragmentCountSuffix) return;

  // ── Configuration from data attributes ──────────────────────────────────
  var smsPrefix = container.getAttribute("data-sms-prefix") || "";
  var smsCharCountLimit = parseInt(
    container.getAttribute("data-sms-char-count-limit") || "612",
    10,
  );

  // ── i18n strings ────────────────────────────────────────────────────────
  function phrase(key, fallback) {
    return (window.APP_PHRASES && window.APP_PHRASES[key]) || fallback;
  }

  // ── Placeholder / text helpers ──────────────────────────────────────────

  /**
   * Strip personalisation placeholders from content, leaving just the
   * static text so we can count actual characters.
   */
  function stripPlaceholders(text) {
    return text.replace(placeholderPattern, "");
  }

  /**
   * Build the full text to count: prefix + ": " + content
   * The service name prefix is prepended by the platform when sending.
   */
  function buildFullText(content) {
    var stripped = stripPlaceholders(content).trim();
    if (smsPrefix) {
      return smsPrefix + ": " + stripped;
    }
    return stripped;
  }

  /**
   * Check if the original content (with placeholders) has any placeholders.
   */
  function hasPlaceholders(content) {
    return placeholderPattern.test(content);
  }

  /**
   * Find non-GSM characters in the content and the words they appear in.
   * Returns an array of { char, words } objects.
   */
  function findNonGsmCharacters(content) {
    // Strip placeholders for analysis
    var text = stripPlaceholders(content);

    // Split into words (roughly)
    var words = text.split(/\s+/);
    var charMap = {}; // char -> Set of words

    for (var w = 0; w < words.length; w++) {
      var word = words[w];
      for (var c = 0; c < word.length; c++) {
        var ch = word[c];
        if (nonGsmAllowedSet.has(ch) && !fullGsmSet.has(ch)) {
          if (!charMap[ch]) {
            charMap[ch] = new Set();
          }
          charMap[ch].add(word);
        }
      }
    }

    var result = [];
    var keys = Object.keys(charMap);
    for (var k = 0; k < keys.length; k++) {
      result.push({
        char: keys[k],
        words: Array.from(charMap[keys[k]]),
      });
    }
    return result;
  }

  // ── DOM updates ─────────────────────────────────────────────────────────

  /**
   * Update the fragment count text and suffix.
   * Only uses "Estimate" wording when personalisation variables are present,
   * since the actual count may be higher with custom content.
   */
  function renderFragmentCount(fragmentCount, characterUnits, hasVars) {
    var countText;
    if (hasVars) {
      if (fragmentCount === 1) {
        countText = phrase(
          "sms_estimate_one",
          "Estimate: 1 text message part. Variables may increase number of messages.",
        );
      } else {
        countText = phrase(
          "sms_estimate",
          "Estimate: {} text message parts. Variables may increase number of messages.",
        ).replace("{}", fragmentCount);
      }
    } else {
      if (fragmentCount === 1) {
        countText = phrase("sms_one", "Total: 1 text message part.");
      } else {
        countText = phrase(
          "sms_count",
          "Total: {} text message parts.",
        ).replace("{}", fragmentCount);
      }
    }

    fragmentCountText.textContent = countText;
    fragmentCountSuffix.textContent = hasVars
      ? " " +
        phrase(
          "sms_variables_warning",
          "Variables may increase number of messages.",
        )
      : "";

    // -- Character count and limit validation ──────────────────────────────
    if (characterCountText) {
      var limit = smsCharCountLimit;
      var remaining = limit - characterUnits;

      if (characterUnits > limit + 1) {
        // Plural
        characterCountText.textContent = phrase(
          "sms_character_count_over_limit",
          "{} too many characters",
        ).replace("{}", Math.abs(remaining));
        characterCountText.classList.add("text-red-700", "font-bold");
      } else if (characterUnits > limit) {
        // Singular
        characterCountText.textContent = phrase(
          "sms_one_character_count_over_limit",
          "1 too many character",
        );
        characterCountText.classList.add("text-red-700", "font-bold");
      } else {
        characterCountText.textContent = "";
        characterCountText.classList.remove("text-red-700", "font-bold");
      }
    }
  }

  /**
   * Update the shortening suggestions list. Shows/hides the section.
   * (Commented out — GSM character counting logic preserved for future use)
   */
  /*
  function renderShorteningSuggestions(nonGsmChars) {
    if (!shortenSection || !shortenList) return;

    if (nonGsmChars.length === 0) {
      shortenSection.classList.add("hidden");
      return;
    }

    shortenSection.classList.remove("hidden");

    // Clear existing list items
    while (shortenList.firstChild) {
      shortenList.removeChild(shortenList.firstChild);
    }

    // Add new list items using DOM methods (no innerHTML)
    for (var i = 0; i < nonGsmChars.length; i++) {
      var entry = nonGsmChars[i];
      var li = document.createElement("li");
      li.textContent = entry.char + " (" + entry.words.join(", ") + ")";
      shortenList.appendChild(li);
    }
  }
  */

  // ── Main update function ────────────────────────────────────────────────

  function update() {
    var content = textarea.value || "";
    var fullText = buildFullText(content);
    var isUnicode = hasUnicodeChars(fullText);
    var characterUnits = countCharacterUnits(fullText, isUnicode);
    var fragmentCount = getFragmentCount(characterUnits, isUnicode);
    var hasVars = hasPlaceholders(content);

    // #BUG - The form validator on submit does not add the service name prefix. 
    // To avoid confusion, we do the same here. 
    // If we fix this bug, we'd use `characterUnits` instead of `content.length`
    renderFragmentCount(fragmentCount, content.length, hasVars);
    // renderShorteningSuggestions(findNonGsmCharacters(content)); // Commented out — preserved for future use
  }

  // ── Debounce helper ─────────────────────────────────────────────────────

  var debounceTimer;
  function debounce(fn, delay) {
    return function () {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fn, delay);
    };
  }

  // ── Initialise ──────────────────────────────────────────────────────────

  var debouncedUpdate = debounce(update, 150);
  textarea.addEventListener("input", debouncedUpdate);

  // Run once on page load to show initial state
  update();
})();
