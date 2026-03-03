/**
 * SMS Character Info Component
 *
 * Displays live SMS fragment count, shortening suggestions for non-GSM characters,
 * and the daily SMS limit below the template content textarea on the SMS template
 * edit/add pages.
 *
 * This component listens to `input` events on the #template_content textarea and
 * updates three informational sections:
 *   1. Fragment count — "Counts as N text messages, maybe more with custom content."
 *   2. Shortening suggestions — "To shorten, remove:" with non-GSM characters listed
 *   3. Daily limit — "X is your daily text message limit"
 *
 * Localisation follows the window.APP_PHRASES pattern used by other components.
 */
(function () {
  "use strict";

  var container = document.getElementById("sms-character-info");
  if (!container) return;

  var textarea = document.getElementById("template_content");
  if (!textarea) return;

  // ── Configuration from data attributes ──────────────────────────────────
  var dailyLimit = container.getAttribute("data-sms-daily-limit") || "";
  var smsPrefix = container.getAttribute("data-sms-prefix") || "";

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

  // ── i18n strings ────────────────────────────────────────────────────────
  function phrase(key, fallback) {
    return (window.APP_PHRASES && window.APP_PHRASES[key]) || fallback;
  }

  // ── Placeholder pattern ─────────────────────────────────────────────────
  // Matches ((variable)) or ((variable??fallback)) patterns
  var placeholderPattern = /\(\(([^)(]+?)(\?\?[^)(]*)?\)\)/g;

  // ── Core SMS counting logic ─────────────────────────────────────────────

  /**
   * Strip personalisation placeholders from content, leaving just the
   * static text so we can count actual characters.
   */
  function stripPlaceholders(text) {
    return text.replace(placeholderPattern, "");
  }

  /**
   * Check if the content contains any characters that force Unicode encoding.
   * Matches the Python `is_unicode` check from notifications_utils.
   */
  function hasUnicodeChars(text) {
    for (var i = 0; i < text.length; i++) {
      if (nonGsmAllowedSet.has(text[i])) {
        return true;
      }
    }
    return false;
  }

  /**
   * Check if a character is in the GSM character set (basic or extension).
   */
  function isGsmChar(ch) {
    return gsmBasicSet.has(ch) || gsmExtensionSet.has(ch);
  }

  /**
   * Count the number of character units in the text.
   * - In GSM mode: basic chars = 1 unit, extension chars = 2 units
   * - In Unicode mode: each character = 1 unit
   */
  function countCharacterUnits(text, isUnicode) {
    if (isUnicode) {
      return text.length;
    }
    var count = 0;
    for (var i = 0; i < text.length; i++) {
      if (gsmExtensionSet.has(text[i])) {
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

  // ── DOM rendering ───────────────────────────────────────────────────────

  /**
   * Create or update the fragment count section.
   */
  function renderFragmentCount(fragmentCount, hasVars) {
    var section = container.querySelector("[data-section='fragment-count']");
    if (!section) {
      section = document.createElement("div");
      section.setAttribute("data-section", "fragment-count");
      section.className = "mt-6 flex items-start gap-2";
      container.appendChild(section);
    }

    var maybeMore = hasVars
      ? ", " + phrase("sms_maybe_more", "maybe more with custom content.")
      : ".";

    var countText;
    if (fragmentCount === 1) {
      countText = phrase("sms_counts_as_one", "Counts as 1 text message");
    } else {
      countText = phrase("sms_counts_as", "Counts as {} text messages").replace(
        "{}",
        fragmentCount
      );
    }

    section.innerHTML =
      '<span class="flex-shrink-0" aria-hidden="true">' +
      '<i class="fa-solid fa-comment text-blue-default"></i>' +
      "</span> " +
      "<span><strong>" +
      countText +
      "</strong>" +
      maybeMore +
      "</span>";
  }

  /**
   * Create or update the shortening suggestions section.
   */
  function renderShorteningSuggestions(nonGsmChars) {
    var section = container.querySelector(
      "[data-section='shorten-suggestions']"
    );

    if (nonGsmChars.length === 0) {
      if (section) section.remove();
      return;
    }

    if (!section) {
      section = document.createElement("div");
      section.setAttribute("data-section", "shorten-suggestions");
      section.className = "mt-4 flex items-start gap-2";
      container.appendChild(section);
    }

    var listItems = "";
    for (var i = 0; i < nonGsmChars.length; i++) {
      var entry = nonGsmChars[i];
      var wordList = entry.words.join(", ");
      listItems +=
        "<li>" + escapeHtml(entry.char) + " (" + escapeHtml(wordList) + ")</li>";
    }

    section.innerHTML =
      '<span class="flex-shrink-0" aria-hidden="true">' +
      '<i class="fa-solid fa-lightbulb text-yellow"></i>' +
      "</span> " +
      "<div><span>" +
      phrase("sms_shorten_remove", "To shorten, remove:") +
      "</span>" +
      '<ul class="list list-bullet ml-8 mt-1">' +
      listItems +
      "</ul></div>";
  }

  /**
   * Create or update the daily limit section.
   */
  function renderDailyLimit() {
    if (!dailyLimit) return;

    var section = container.querySelector("[data-section='daily-limit']");
    if (!section) {
      section = document.createElement("div");
      section.setAttribute("data-section", "daily-limit");
      section.className = "mt-4 flex items-start gap-2";
      container.appendChild(section);
    }

    section.innerHTML =
      '<span class="flex-shrink-0" aria-hidden="true">' +
      '<i class="fa-solid fa-circle-check text-blue-default"></i>' +
      "</span> " +
      "<span><strong>" +
      escapeHtml(dailyLimit) +
      "</strong> " +
      phrase(
        "sms_daily_limit",
        "is your daily text message limit"
      ) +
      "</span>";
  }

  /**
   * Escape HTML special characters to prevent XSS.
   */
  function escapeHtml(text) {
    var div = document.createElement("div");
    div.appendChild(document.createTextNode(text));
    return div.innerHTML;
  }

  // ── Main update function ────────────────────────────────────────────────

  function update() {
    var content = textarea.value || "";
    var fullText = buildFullText(content);
    var isUnicode = hasUnicodeChars(fullText);
    var characterUnits = countCharacterUnits(fullText, isUnicode);
    var fragmentCount = getFragmentCount(characterUnits, isUnicode);
    var hasVars = hasPlaceholders(content);

    renderFragmentCount(fragmentCount, hasVars);
    renderShorteningSuggestions(findNonGsmCharacters(content));
    renderDailyLimit();
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
