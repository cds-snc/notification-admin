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

  global.utils = {
    registerKeyDownEscape: registerKeyDownEscape,
  };
})(window);
