(function (Modules) {
  "use strict";

  const registerKeyBasedMenuNavigation =
    window.utils.registerKeyBasedMenuNavigation;

  // Toggles the visibility of the more menu and updates the aria-expanded attribute.
  function toggleMenu($moreMenuButton, $moreMenu, $items) {
    const isExpanded = $moreMenuButton.attr("aria-expanded") == "true";
    // Toggle the aria-expanded attribute FIRST
    $moreMenuButton.attr("aria-expanded", !isExpanded);
    // If true, class is added. To show the menu, we toggle with the inverse of isExpanded.
    $moreMenu.toggleClass("hidden", isExpanded);
    // If opening the menu, set focus to the first item
    if (!isExpanded) {
      $moreMenuButton.selectedMenuItem = 0;
      $items.children().find("[href]").attr("tabindex", "-1");
      $items.children().first().find("[href]").trigger("focus");
      $items.children().first().find("[href]").attr("tabindex", "0");
    }
  }

  // Initializes the more menu functionality.
  function init($moreMenuButton) {
    const menuItemsId = "#" + $moreMenuButton.attr("data-module-menu-items");
    const menuContainerId =
      "#" + $moreMenuButton.attr("data-module-menu-container");

    const $menuItems = $(menuItemsId);
    const $moreMenu = $(menuContainerId);
    const $moreMenuItems = $(
      `#${$moreMenuButton.attr("data-module-menu-more-items")}`,
    );
    let itemsWidth = 0;
    //$moreMenuButton.selectedMenuItem = 0;

    // Attach click event handler
    $moreMenuButton.click(() =>
      toggleMenu($moreMenuButton, $moreMenu, $moreMenuItems),
    );

    // Bind Keypress events to the window so the user can use the arrow/home/end keys to navigate the drop down menu
    registerKeyBasedMenuNavigation($(window), (event) =>
      handleKeyBasedMenuNavigation(
        event,
        $moreMenuButton,
        $moreMenu,
        $moreMenuItems,
      ),
    );

    // // Keep Escape key functionality for accessibility
    // registerKeyDownEscape($(window), () => toggleMenu($moreMenuButton, $moreMenuItems));

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
    function handleKeyBasedMenuNavigation(event, $menu, $container, $items) {
      if ($menu.attr("aria-expanded") == "true") {
        // Menu Button Keyboard Interaction: https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/
        // Left and Right arrows do nothing because we don't support sub menus
        // Note the difference between menubar and menu in the above guidance. We made a menu, not a menubar.

        var menuItems = $items.children();

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
          // Escape: Close the menu that contains focus and return focus to the element or context, e.g., menu button or parent menuitem, from which the menu was opened.
          event.preventDefault();
          toggleMenu($menu, $container, $items);
          $menu.trigger("focus");
        } else if (event.key === "Tab") {
          // Tab: Nothing. Should close the popup and move to the next interactive element on the page, so we will close the menu so it does not obscure anything.
          toggleMenu($menu, $container, $items);
          // We don't prevent default. We don't trigger focus, because the selectedMenuItem is in the collapsed menu.
          return;
        }
        // Once we've determined the new selected menu item, we need to focus on it
        var $selected_item = $($items.children()[$menu.selectedMenuItem]).find(
          "[href]",
        );
        $selected_item.trigger("focus");
        $items.children().find("[href]").attr("tabindex", "-1");
        $selected_item.attr("tabindex", "0");
      }
    }

    // Determines whether an element overflows, excluding the more button.
    function shouldItemOverflow(element, containerWidth, moreButtonWidth) {
      return parseInt(element.dataset.overflowsAt) >
        containerWidth - moreButtonWidth
        ? "more"
        : "main";
    }

    // Calculates the width at which each menu item overflows.
    function calculateItemOverflows() {
      let gap = parseInt(window.getComputedStyle($menuItems[0]).columnGap) || 0;
      // Start with a negative gap. We want to get the right edge of the item, without the gap.
      itemsWidth = -gap;

      $menuItems.children().each(function () {
        // Add item width
        itemsWidth += $(this).outerWidth(true);
        // Add gap
        itemsWidth += gap;
        $(this).attr("data-overflows-at", itemsWidth);
      });
      return itemsWidth;
    }

    // Resizes the menu, determining which items should be in the main menu and which in the more menu.
    function resizeMenu() {
      // Get the current container width
      const containerWidth = $menuItems.width();
      // const moreButtonWidth = $moreMenuButton.outerWidth(true);
      let collectedSet = {};

      // First pass - check if any items overflow without the more button
      collectedSet = Object.groupBy(
        $menuItems.children().not("[data-module='more-menu']"),
        (el) => shouldItemOverflow(el, containerWidth, 0),
      );

      // If there are overflow items, run a second pass accounting for the more button width
      if (collectedSet.more && collectedSet.more.length > 0) {
        collectedSet = Object.groupBy(
          $menuItems.children().not("[data-module='more-menu']"),
          (el) => shouldItemOverflow(el, containerWidth, 0),
        );
      }

      // Update the DOM based on the results
      const $moreMenuItems = $(menuContainerId + " > ul");

      if (collectedSet.more && collectedSet.more.length > 0) {
        // Add items to the more menu
        $moreMenuItems.empty().append($(collectedSet.more).clone());
        // Update state
        $moreMenuButton.attr("data-has-items", true);
        $(collectedSet.more).attr("data-overflows", true);

        if (collectedSet.main && collectedSet.main.length > 0) {
          $(collectedSet.main).attr("data-overflows", false);
        }
      } else {
        // No overflow items
        $moreMenuButton.attr("data-has-items", false);
        $moreMenuItems.empty();

        if (collectedSet.main && collectedSet.main.length > 0) {
          $(collectedSet.main).attr("data-overflows", false);
        }
      }
    }

    /**
     * Calculates and applies the overflow state to menu items
     * Called during initial load and whenever container dimensions change
     */
    function updateMenuOverflow() {
      if (window.innerWidth <= 768) {
        // Mobile view - clear more menu
        $(menuContainerId + " > ul").empty();
        $moreMenuButton.attr("data-has-items", false);
        $menuItems.find("[data-overflows]").attr("data-overflows", false);
        return;
      }

      // Desktop view - calculate and update
      calculateItemOverflows();
      resizeMenu();
    }

    /**
     * Sets up a ResizeObserver to detect container size changes
     * This catches flex layout adjustments after initial render
     */
    function setupResizeObserver() {
      if (typeof ResizeObserver === "undefined") {
        // Fallback for browsers without ResizeObserver
        return;
      }

      const observer = new ResizeObserver((entries) => {
        // This will fire when the container's size changes for any reason
        // including flex layout adjustments
        updateMenuOverflow();
      });

      // Observe the menu items container
      observer.observe($menuItems[0]);

      return observer;
    }

    /**
     * Handles window resize events separately from container resize
     * Window resizing can trigger media query changes
     */
    const handleWindowResize = function () {
      updateMenuOverflow();
    };

    /**
     * Sets up all event handlers and observers for the menu
     * This is the main initialization function that gets called after DOM is ready
     */
    function initializeMenu() {
      // Do initial overflow calculations
      updateMenuOverflow();

      // Setup observer for container size changes (handles flex layout adjustments)
      const resizeObserver = setupResizeObserver();

      // Setup handler for window resize (handles viewport changes)
      window.addEventListener("resize", handleWindowResize);

      // Return cleanup function for potential future use
      return function cleanup() {
        window.removeEventListener("resize", handleWindowResize);
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
      };
    }

    // Execution starts here - ensure everything is ready before calculating dimensions
    if (document.readyState === "complete") {
      // Document is already fully loaded (DOM, styles, images, fonts)
      initializeMenu();
    } else {
      // Wait for the window load event before initializing
      window.addEventListener("load", initializeMenu);
    }
  }

  // Expose the MoreMenu module.
  Modules.MoreMenu = function () {
    this.start = function (component) {
      const $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
