(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;

  function open($menu, $items) {
    // show menu
    if (!this.hasFocus) {
      $items.toggleClass("hidden", false);
      $items.removeAttr("hidden");
      $items.removeClass("opacity-0");
      $items.addClass("opacity-100");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", true);
      }
      $menu.attr("aria-expanded", true);
      this.hasFocus = true;
    }
  }

  function close($menu, $items) {
    // hide menu if open
    if (this.hasFocus) {
      $items.toggleClass("hidden", true);
      $items.attr("hidden");
      $items.removeClass("opacity-100");
      $items.addClass("opacity-0");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", false);
      }
      $menu.attr("aria-expanded", false);
      this.hasFocus = false;
    }
  }

  function toggleMenu($menu, $items) {
    const show = $items.hasClass("hidden");

    // Show the menu..
    if (show) {
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
    const $menuItems = $items.children("[href]");

    $menu.click(() => toggleMenu($menu, $items));
    registerKeyDownEscape($items, () => close($menu, $items));
    $("body").click((e) => {
      if (e.target != $menu[0]) {
        close($menu, $items);
      }
    });
    // Key handlers for toggle button
    $menu.keydown((e) => {
      let flag = false;
      switch (e.code) {
        case "Enter":
        case "Space":
        case "ArrowDown":
          if ($menu) {
            open($menu, $items);
            flag = true;
          }
          break;
        case "ArrowUp":
          if ($menu) {
            open($menu, $items);
            flag = true;
          }
          break;
        case "Escape":
          close($menu, $items);
          break;
        default:
          break;
      }
      if (flag) {
        e.stopPropagation();
        e.preventDefault();
      }
    });

    //Key handlers for list of links
    $menuItems.keydown((e) => {
      let flag = false;
      switch (e.code) {
        case "Escape":
          close($menu, $items);
          break;
        default:
          break;
      }
      if (flag) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

  Modules.Menu = function () {
    this.menuItems = [];
    this.firstItem = null;
    this.lastItem = null;
    this.hasFocus = false;

    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
