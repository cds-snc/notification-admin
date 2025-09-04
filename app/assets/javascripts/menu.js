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
    $items.children().find("[href]").attr("tabindex", "-1");
    $items.children().first().find("[href]").trigger("focus");
    $items.children().first().find("[href]").attr("tabindex", "0");
    $menu.isExpanded = true;
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
    $(window).off("keydown");
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
      close($(menu), $(`ul[id=${$(menu).attr("aria-controls")}]`));
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

    // Menu Button Keyboard Interaction: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
    // Left and Right arrows do nothing because we don't support sub menus
    // Note the difference between menubar and menu in the above guidance. We made a menu, not a menubar.

    if ($menu.attr("aria-expanded") == "true") {
      if (event.key === "ArrowUp") {
        // Up Arrow: Moves focus to and selects the previous option. If focus is on the first option, wraps to the last item.
        event.preventDefault();
        $menu.selectedMenuItem =
          ($menu.selectedMenuItem - 1 + menuItems.length) % menuItems.length;
      } else if (event.key === "ArrowDown") {
        // Down Arrow: Moves focus to and selects the next option. If focus is on the last option, wraps to the first item.
        event.preventDefault();
        $menu.selectedMenuItem =
          ($menu.selectedMenuItem + 1) % menuItems.length;
      } else if (event.key === "Escape") {
        // Escape: Closes the popup and returns focus to the combobox. Optionally, if the combobox is editable, clears the contents of the combobox.
        event.preventDefault();
        close($menu, $items);
      } else if (event.key === "Tab") {
        // Tab: Nothing. Should close the popup and move to the next interactive element on the page, so we will close the menu so it does not obscure anything.
        close($menu, $items);
        // We don't prevent default. We don't trigger focus, because the selectedMenuItem is in the collapsed menu.
        return;
      }
      // Once we've determined the new selected menu item, we need to focus on it
      $selected_item = $($items.children()[$menu.selectedMenuItem]).find(
        "[href]",
      );
      $selected_item.trigger("focus");
      $items.children().find("[href]").attr("tabindex", "-1");
      $selected_item.attr("tabindex", "0");
    }
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("aria-controls");
    const $items = $(itemsId);
    $menu.isExpanded = false;
    $menu.selectedMenuItem = 0;
    $menu.touchStarted = false;
    $items.attr({ role: "menu", "aria-labelledby": $menu.attr("id") });
    $items.children().attr("role", "none");
    $items.children().find("[href]").attr({ role: "menuitem", tabindex: "-1" });

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
