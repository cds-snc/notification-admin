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
  }

  function close($menu, $items) {
    $items.toggleClass("hidden", true);

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
   * Closes the menu and detaches any global event handlers that were attached when the menu
   * was opened.
   * This is called when menu items with the `data-menu-close-on-click` attribute are clicked,
   * as it signifies that the item will not navigate to a new page and may instead modify the
   * DOM in some way, requiring us to clean up our event handlers after closing the menu to
   * ensure they do not interfere with any other components on the page.
   * e.g. Preserving tab navigation, a modal dialog was opened, new form elements were added
   * to the page, etc.
   *
   * @param {jQuery} $menu The menu button that controls the disclosure menu items container
   * @param {jQuery} $items The unordered list containing menu items
   */
  function closeAndDetach($menu, $items) {
    close($menu, $items);
    // Detach global keydown handlers
    $(window).off('keydown');
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
   * DISABLED: Menu can only be closed by clicking menu button or visiting new page
   *
   * @param {FocusEvent} event The focus event
   * @param {jQuery} $menu The menu button that controls the disclosure menu items container
   * @param {jQuery} $items The unordered list containing menu items
   */
  function handleMenuBlur(event, $menu, $items) {
    // DISABLED: No longer close menu on blur - only close via menu button or page navigation
    return;
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
      // Once we've determined the new selected menu item, we need to focus on it
      $($items.children()[$menu.selectedMenuItem]).find("a").focus();
    }
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    $menu.isExpanded = false;
    $menu.selectedMenuItem = 0;
    $menu.touchStarted = false;

    // Enhanced touch/click handling for iOS
    $menu.on("touchstart", function (e) {
      $menu.touchStarted = true;
    });

    $menu.on("touchend", function (e) {
      if ($menu.touchStarted) {
        e.preventDefault();
        e.stopPropagation();
        // Small delay to ensure touch event completes properly on iOS
        setTimeout(() => {
          toggleMenu($menu, $items);
        }, 10);
        $menu.touchStarted = false;
      }
    });

    $menu.on("click", function (e) {
      // Only handle click if it wasn't preceded by a touch event
      if (!$menu.touchStarted) {
        e.preventDefault();
        e.stopPropagation();
        toggleMenu($menu, $items);
      }
    });

    // Some items in the menu may not link to a new page, they may perform
    // an action that modifies the DOM. In this case the menu's event handlers
    // interfere with tab based navigation, so we need to close the menu and
    // detach the event handlers when the user clicks on these menu items.
    $items.on("click", "[data-menu-close-on-click='true']", function (e) {
      closeAndDetach($menu, $items);
    });

    // Bind Keypress events to the window so the user can use the arrow/home/end keys to navigate the drop down menu
    registerKeyBasedMenuNavigation($(window), (event) =>
      handleKeyBasedMenuNavigation(event, $menu, $items),
    );

    // Keep Escape key functionality for accessibility
    registerKeyDownEscape($(window), () => close($menu, $items));
  }

  Modules.Menu = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
