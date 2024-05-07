(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;
  const registerKeyBasedMenuNavigation =
    window.utils.registerKeyBasedMenuNavigation;
  const registerDisclosureMenuBlur = window.utils.registerDisclosureMenuBlur;

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

  function toggleMenu($menu, $items) {
    // Show the menu..
    if (!$menu.hasFocus) {
      // Before we open a new menu, check if there are any other open menus and close them
      var menus = document.querySelectorAll("button[data-module='menu']");
      menus.forEach((menu) => {
        if (menu !== $menu && $(menu).attr("aria-expanded") == "true") {
          close($(menu), $(document.querySelectorAll(`ul[id=${$(menu).attr("data-menu-items")}]`)));
        }
      });
      open($menu, $items);
    }
    // Hide the menu if it's open
    else if ($menu.hasFocus || document.activeElement in $items.children()) {
      close($menu, $items);
    }
  }

  function handleMenuBlur(event, $menu, $items) {
    console.log(`${event} -- ${$menu} -- ${$items}`);
  }

  function handleKeyBasedMenuNavigation(event, $menu, $items) {
    var menuItems = $items.children();

    if ($menu.attr("aria-expanded") == "true") {
      // Support for Home/End on Windows and Linux + Cmd + Arrows for Mac
      if (event.key == "Home" || (event.metaKey && event.key == "ArrowLeft")) {
        event.preventDefault();
        $menu.currentMenuItem = 0;
      } else if (
        event.key == "End" ||
        (event.metaKey && event.key == "ArrowRight")
      ) {
        event.preventDefault();
        $menu.currentMenuItem = menuItems.length - 1;
      } else if (
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        (event.shiftKey && event.key === "Tab")
      ) {
        event.preventDefault();
        $menu.currentMenuItem =
          $menu.currentMenuItem == 0
            ? menuItems.length - 1
            : Math.max(0, $menu.currentMenuItem - 1);
      } else if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight" ||
        event.key === "Tab"
      ) {
        event.preventDefault();
        $menu.currentMenuItem =
          $menu.currentMenuItem == menuItems.length - 1
            ? 0
            : Math.min(menuItems.length - 1, $menu.currentMenuItem + 1);
      }
    }

    // Set the focus
    $items.children()[$menu.currentMenuItem].querySelector("a").focus();
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    $menu.hasFocus = false;
    $menu.currentMenuItem = 0;

    // Click toggler
    $menu.click(() => toggleMenu($menu, $items));

    // Keypress event so the user can use the arrow/home/end keys to navigate the drop down menu
    registerKeyBasedMenuNavigation($(window), (event) =>
      handleKeyBasedMenuNavigation(event, $menu, $items),
    );

    registerDisclosureMenuBlur([...$items.children(), ...$menu], (event) => handleMenuBlur(event, $menu, $items));

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
