(function (Modules) {
  "use strict";

  function registerMenuEscape($selector, toggleFn) {
    $selector.keydown(function (e) {
      if (e.key == "Escape") {
        const displayed = !!$selector.not(":hidden");
        if (displayed) toggleFn();
      }
    });
  }

  function toggleMenu($content) {
    // We need to revert the hidden and opacity operations when showing and
    // hiding the menu.

    // Show the menu..
    const show = $content.hasClass("hidden");
    if (show) {
      $content.toggleClass("hidden", false);
    }
    // Hide the menu..
    else {
      $content.removeClass("opacity-100");
      $content.addClass("opacity-0");
    }

    $content.find("a")[0].focus();

    // In order to have the opacity transition effect working properly,
    // we need to separate the hidden and opacity toggling in two separate
    // actions in the HTML rendering, hence the delay of opacity by 1 ms.
    window.setTimeout(function () {
      if (show) {
        // show menu
        $content.removeClass("opacity-0");
        $content.addClass("opacity-100");
      } else {
        // hide menu
        $content.toggleClass("hidden", true);
      }
    }, 1);
  }

  function init($menuButton) {
    const contentId = "#" + $menuButton.attr("data-mobile-menu-content");
    const $content = $(contentId);
    
    const closeId = "#" + $menuButton.attr("data-mobile-menu-account-close");
    const $closeButton = $content.find(closeId);

    const fn = () => toggleMenu($content);
    $menuButton.click(fn);
    $closeButton.click(fn);
    registerMenuEscape($content, fn);
  }

  Modules.MobileMenuAccount = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
