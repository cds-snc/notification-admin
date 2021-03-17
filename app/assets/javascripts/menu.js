(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;

  function toggleMenu($menu, $items) {
    // We need to revert the hidden and opacity operations when showing and
    // hiding the menu.

    // Show the menu..
    const show = $items.hasClass("hidden");
    $menu.attr("aria-expanded", show);
    if (show) {
      $items.toggleClass("hidden", false);
    }
    // Hide the menu..
    else {
      $items.removeClass("opacity-100");
      $items.addClass("opacity-0");
    }

    const $arrow = $menu.find(".arrow");
    if ($arrow.length > 0) {
      $arrow.toggleClass("flip", show);
    }

    // In order to have the opacity transition effect working properly,
    // we need to separate the hidden and opacity toggling in two separate
    // actions in the HTML rendering, hence the delay of opacity by 1 ms.
    window.setTimeout(function () {
      if (show) {
        // show menu
        $items.removeClass("opacity-0");
        $items.addClass("opacity-100");
      } else {
        // hide menu
        $items.toggleClass("hidden", true);
      }
    }, 1);
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);

    const fn = () => toggleMenu($menu, $items);
    $menu.click(fn);
    registerKeyDownEscape($items, fn);
  }

  Modules.Menu = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
