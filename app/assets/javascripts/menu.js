(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;
  const registerKeyBasedMenuNavigation =
    window.utils.registerKeyBasedMenuNavigation;
  const registerDisclosureMenuBlur = window.utils.registerDisclosureMenuBlur;

  function open($menu, $items) {
    // show menu if closed
    $items.toggleClass("hidden", false);
    $items.removeAttr("hidden");
    const $arrow = $menu.find(".arrow");
    if ($arrow.length > 0) {
      $arrow.toggleClass("flip", true);
    }

    $menu.attr("aria-expanded", true);
    $menu.isExpanded = true;
    $items.children()[0].querySelector("a").focus();

    window.setTimeout(function () {
      $items.removeClass("opacity-0");
      $items.addClass("opacity-100");
    }, 1);
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
    $menu.isExpanded = false;
    $menu.selectedMenuItem = 0;

    window.setTimeout(function () {
      $items.toggleClass("hidden", true);
      $items.attr("hidden");
    }, 1);
  }

  /**
   * Toggles the aria-expanded state of the menu to show/hide the disclosure menu's items.
   * Before opening a menu, it checks for any other menus that may be open and closes them
   *
   * @param {jQuery} $menu The menu button that controls the disclosure menu items container
   * @param {jQuery} $items The unordered list containing menu items
   */
  function toggleMenu($menu, $items) {
    // Get all the menus on the page that are open excluding the currently open menu and close them
    const openMenus = Array.from(
      document.querySelectorAll("button[data-module='menu']"),
    ).filter(
      (menu) =>
        menu.getAttribute("aria-expanded") == "true" && menu !== $menu[0],
    );
    openMenus.forEach((menu) => {
      close($(menu), $(`ul[id=${$(menu).attr("data-menu-items")}]`));
    });

    // We're using aria-expanded to determine the open/close state of the menu.
    // The menu object's state does not get updated in time to use $menu.isExpanded
    // Open the menu if it's closed
    if ($menu.attr("aria-expanded") === "false") {
      open($menu, $items);
    }
    // Hide the menu if it's open
    else if ($menu.attr("aria-expanded") === "true") {
      close($menu, $items);
      $menu[0].focus();
    }
  }

  /**
   * Handles closing any open menus when the user clicks outside of the menu with their mouse.
   *
   * @param {FocusEvent} event The focus event
   * @param {jQuery} $menu The menu button that controls the disclosure menu items container
   * @param {jQuery} $items The unordered list containing menu items
   */
  function handleMenuBlur(event, $menu, $items) {
    if (event.relatedTarget === null) {
      close($menu, $items);
    }
  }

  /**
   * Handles the keydown event for the $menu so the user can navigate the menu items via the keyboard.
   * This function supports the following key presses:
   * - Home/End to navigate to the first and last items in the menu
   * - Up/Left/Shift + Tab to navigate to the previous item in the menu
   * - Down/Right/Tab to navigate to the next item in the menu
   * - Meta + (Left/Right OR Up/Down) to navigate to the first/last items in the menu
   *
   * @param {KeyboardEvent} event The keydown event object
   * @param {jQuery Object} $menu The menu button that controls the disclosure menu items container
   * @param {jQuery Object} $items The unordered list containing menu items
   */
  function handleKeyBasedMenuNavigation(event, $menu, $items) {
    var menuItems = $items.children();

    if ($menu.attr("aria-expanded") == "true") {
      // Support for Home/End on Windows and Linux + Cmd + Arrows for Mac
      if (event.key == "Home" || (event.metaKey && event.key == "ArrowLeft")) {
        event.preventDefault();
        $menu.selectedMenuItem = 0;
      } else if (
        event.key == "End" ||
        (event.metaKey && event.key == "ArrowRight")
      ) {
        event.preventDefault();
        $menu.selectedMenuItem = menuItems.length - 1;
      } else if (
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        (event.shiftKey && event.key === "Tab")
      ) {
        event.preventDefault();
        $menu.selectedMenuItem =
          $menu.selectedMenuItem == 0
            ? menuItems.length - 1
            : Math.max(0, $menu.selectedMenuItem - 1);
      } else if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight" ||
        event.key === "Tab"
      ) {
        event.preventDefault();
        $menu.selectedMenuItem =
          $menu.selectedMenuItem == menuItems.length - 1
            ? 0
            : Math.min(menuItems.length - 1, $menu.selectedMenuItem + 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        close($menu, $items);
        $menu.focus();
      }
    }

    // Once we've determined the new selected menu item, we need to focus on it
    $($items.children()[$menu.selectedMenuItem]).find("a").focus();
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    $menu.isExpanded = false;
    $menu.selectedMenuItem = 0;

    // Click toggler
    $menu.click(() => toggleMenu($menu, $items));

    // Bind Keypress events to the window so the user can use the arrow/home/end keys to navigate the drop down menu
    registerKeyBasedMenuNavigation($(window), (event) =>
      handleKeyBasedMenuNavigation(event, $menu, $items),
    );

    // Bind blur events to each menu button and it's anchor link items.
    registerDisclosureMenuBlur(
      [...$items.children().find("a"), ...$menu, window],
      (event) => handleMenuBlur(event, $menu, $items),
    );

    // Bind a Keydown event to the window so the user can use the Escape key from anywhere in the window to close the menu
    registerKeyDownEscape($(window), () => close($menu, $items));
  }

  Modules.Menu = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
