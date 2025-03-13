(function utils(global) {
  "use strict";

  /**
   * Registers a listener function on escape key down press.
   *
   * @param {*} $selector the JQuery selector to listen to
   * @param {*} fn Function to execute on Escape key press
   */
  function registerKeyDownEscape($selector, fn) {
    $selector.keydown(function (e) {
      if (e.key == "Escape") {
        const displayed = !!$selector.not(":hidden");
        if (displayed) fn();
      }
    });
  }

  function registerKeyBasedMenuNavigation($selector, fn) {
    $selector.keydown(function (e) {
      var menuVisible = !!$selector.not(":hidden");
      if (menuVisible) fn(e);
    });
  }

  function registerDisclosureMenuBlur($selectors, fn) {
    $selectors.forEach((selector) => {
      selector.addEventListener("blur", function (e) {
        fn(e);
      });
    });
  }

  function emailSafe(string, whitespace = ".") {
    // this is the javascript equivalent of the python function app/utils.py:email_safe

    // Strip accents, diacritics etc
    string = string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Replace spaces with the whitespace character (default ".")
    string = string.trim().replace(/\s+/g, whitespace);

    // Keep only alphanumeric, whitespace character, hyphen and underscore
    string = string
      .split("")
      .map((char) => {
        return /[a-zA-Z0-9]/.test(char) || [whitespace, "-", "_"].includes(char)
          ? char.toLowerCase()
          : "";
      })
      .join("");

    // Replace multiple consecutive dots with a single dot
    string = string.replace(/\.{2,}/g, ".");

    // Replace sequences like ".-." or "._." with just "-" or "_"
    string = string.replace(/(\.)([-_])(\.)/g, "$2");

    // Disallow repeating ., -, or _
    string = string.replace(/(\.|-|_){2,}/g, "$1");

    // Remove dots at beginning and end
    return string.replace(/^\.|\.$/g, "");
  }

  /**
   * Make branding links automatically go back to the previous page without keeping track of them
   */
  document
    .querySelector(".branding .back-link")
    ?.addEventListener("click", function (e) {
      e.preventDefault();
      window.history.back();
    });

  global.utils = {
    registerKeyDownEscape: registerKeyDownEscape,
    registerKeyBasedMenuNavigation: registerKeyBasedMenuNavigation,
    registerDisclosureMenuBlur: registerDisclosureMenuBlur,
    emailSafe: emailSafe,
  };
})(window);
