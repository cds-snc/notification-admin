(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;

  function open($menu, $items) {
    // show menu if closed
    if (!this.hasFocus) {
      $items.toggleClass("hidden", false);
      $items.removeAttr("hidden");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", true);
      }

      $menu.attr("aria-expanded", true);
      this.hasFocus = true;

      window.setTimeout(function () {
        $items.removeClass("opacity-0");
        $items.addClass("opacity-100");
      }, 1);
    }
  }

  function close($menu, $items) {
    // hide menu if open
    if (this.hasFocus) {
      $items.toggleClass("hidden", true);
      $items.removeClass("opacity-100");
      $items.addClass("opacity-0");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", false);
      }

      $menu.attr("aria-expanded", false);
      this.hasFocus = false;

      window.setTimeout(function () {
        $items.toggleClass("hidden", true);
        $items.attr("hidden");
      }, 1);
    }
  }

  function toggleMenu($menu, $items) {
    // Show the menu..
    if (!this.hasFocus) {
      open($menu, $items);
    }
    // Hide the menu..
    else {
      close($menu, $items);
    }
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    this.hasFocus = false;

    // Click toggler
    $menu.click(() => toggleMenu($menu, $items));

    // Register Escape key from anywhere in the window to close the menu
    registerKeyDownEscape($(window), () => close($menu, $items));
  }

  Modules.Menu = function () {
    this.hasFocus;

    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
