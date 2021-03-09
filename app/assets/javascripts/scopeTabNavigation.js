(function (Modules) {
  "use strict";

  function safeAddEventListener(selector, event, fn) {
    if (document.querySelector(selector))
      document.querySelector(selector).addEventListener(event, fn);
  }

  const focusableElements =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

  /**
   * Registers a scope around the given menu selector.
   *
   * The given menu selector will get the TAB navigation entrapped within its
   * container's focusable elements, hence creating a navigation scope around
   * it. This will only apply to the container itself and will not hinder
   * other elements of the page as long as the container is not reached. This
   * works well within a modal popup that took focus away from the main window.
   */
  function registerTabNavigationScope(modal) {
    const firstFocusableElement = modal.querySelectorAll(focusableElements)[0];
    const focusableContent = modal.querySelectorAll(focusableElements);
    const lastFocusableElement = focusableContent[focusableContent.length - 1];

    document.addEventListener("keydown", function (e) {
      let isTabPressed = e.key === "Tab" || e.keyCode === 9;

      if (!isTabPressed) {
        return;
      }

      if (e.shiftKey) {
        // if shift key pressed for shift + tab combination
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus(); // add focus for the last focusable element
          e.preventDefault();
        }
      } else {
        // if tab key is pressed
        if (document.activeElement === lastFocusableElement) {
          // if focused has reached to last focusable element then focus first focusable element after pressing tab
          firstFocusableElement.focus(); // add focus for the first focusable element
          e.preventDefault();
        }
      }
    });

    firstFocusableElement.focus();
  }

  function init($component) {
    registerTabNavigationScope($component[0])
  }

  Modules.ScopeTabNavigation = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
