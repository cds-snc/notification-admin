(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;
  const registerKeyBasedMenuNavigation =
    window.utils.registerKeyBasedMenuNavigation;

  function open($menu, $items) {
    // show menu if closed
    if (!$menu.hasFocus) {
      $items.toggleClass("hidden", false);
      $items.removeAttr("hidden");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", true);
      }

      $menu.attr("aria-expanded", true);
      $menu.hasFocus = true;
      $menu.currentMenuItem = 0;
      $items.children()[$menu.currentMenuItem].querySelector("a").focus();

      window.setTimeout(function () {
        $items.removeClass("opacity-0");
        $items.addClass("opacity-100");
      }, 1);
    }
  }

  function close($menu, $items) {
    // hide menu if open
    if ($menu.hasFocus || document.activeElement in $items.children()) {
      $items.toggleClass("hidden", true);
      $items.removeClass("opacity-100");
      $items.addClass("opacity-0");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", false);
      }

      $menu.attr("aria-expanded", false);
      $menu.hasFocus = false;
      $menu.currentMenuItem = 0;

      window.setTimeout(function () {
        $items.toggleClass("hidden", true);
        $items.attr("hidden");
      }, 1);
    }
  }

  function toggleMenu($menu, $items) {
    // Show the menu..
    if (!$menu.hasFocus) {
      open($menu, $items);
    }
    // Hide the menu..
    else {
      close($menu, $items);
    }
  }

  function handleKeyBasedMenuNavigation(event, $menu, $items) {
    var menuItems = $items.children();
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      $menu.currentMenuItem =
        $menu.currentMenuItem == menuItems.length - 1
          ? 0
          : Math.min(menuItems.length - 1, $menu.currentMenuItem + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      $menu.currentMenuItem =
        $menu.currentMenuItem == 0
          ? menuItems.length - 1
          : Math.max(0, $menu.currentMenuItem - 1);
    } else if (event.key == "Home") {
      event.preventDefault();
      $menu.currentMenuItem = 0;
    } else if (event.key == "End") {
      event.preventDefault();
      $menu.currentMenuItem = menuItems.length - 1;
    }

    $items.children()[$menu.currentMenuItem].querySelector("a").focus();
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    $menu.hasFocus = false;
    $menu.currentMenuItem = 0;

    // Click toggler
    $menu.click(() => toggleMenu($menu, $items));

    $.each($items.children(), function (i, element) {
      $(element.querySelector("a")).on("blur", () => close($menu, $items));
    });

    // Keypress event so the user can use the arrow/home/end keys to navigate the drop down menu
    registerKeyBasedMenuNavigation($(window), (event) =>
      handleKeyBasedMenuNavigation(event, $menu, $items),
    );

    // Register Escape key from anywhere in the window to close the menu
    registerKeyDownEscape($(window), () => close($menu, $items));
  }

  Modules.Menu = function () {
    this.hasFocus;
    this.currentMenuItem;

    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
