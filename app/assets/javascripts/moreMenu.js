(function (Modules) {
  "use strict";

  // Toggles the visibility of the more menu and updates the aria-expanded attribute.
  function toggleMenu($moreMenuButton, $moreMenu) {
    const isExpanded = $moreMenuButton.attr("aria-expanded") == "true";
    // Toggle the aria-expanded attribute FIRST
    $moreMenuButton.attr("aria-expanded", !isExpanded);
    // If true, class is added. To show the menu, we toggle with the inverse of isExpanded.
    $moreMenu.toggleClass("hidden", isExpanded);
  }

  // Initializes the more menu functionality.
  function init($moreMenuButton) {
    const menuItemsId = "#" + $moreMenuButton.attr("data-module-menu-items");
    const menuContainerId =
      "#" + $moreMenuButton.attr("data-module-menu-container");

    const $menuItems = $(menuItemsId);
    const $moreMenu = $(menuContainerId);
    let itemsWidth = 0;
    
    // Attach click event handler
    $moreMenuButton.click(() => toggleMenu($moreMenuButton, $moreMenu));

    // Determines whether an element overflows, excluding the more button.
    function shouldItemOverflow(element, containerWidth, moreButtonWidth) {
      return parseInt(element.dataset.overflowsAt) > containerWidth - moreButtonWidth
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
      const moreButtonWidth = $moreMenuButton.outerWidth(true);
      let collectedSet = {};

      // First pass - check if any items overflow without the more button
      collectedSet = Object.groupBy(
        $menuItems.children().not("[data-module='more-menu']"),
        (el) => shouldItemOverflow(el, containerWidth, 0)
      );

      // If there are overflow items, run a second pass accounting for the more button width
      if (collectedSet.more && collectedSet.more.length > 0) {
        collectedSet = Object.groupBy(
          $menuItems.children().not("[data-module='more-menu']"),
          (el) => shouldItemOverflow(el, containerWidth, 0)
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
      if (typeof ResizeObserver === 'undefined') {
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
    const handleWindowResize = function() {
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
      window.addEventListener('resize', handleWindowResize);
      
      // Return cleanup function for potential future use
      return function cleanup() {
        window.removeEventListener('resize', handleWindowResize);
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
      window.addEventListener('load', initializeMenu);
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
