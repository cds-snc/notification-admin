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
    let overflowsCalculated = false;

    $moreMenuButton.click(() => toggleMenu($moreMenuButton, $moreMenu));

    // Calculates the width at which each menu item overflows.
    const calculateOverflows = () => {
      if (window.innerWidth > 768) {
        let gap = parseInt(window.getComputedStyle($menuItems[0]).columnGap);
        $menuItems.children().each(function () {
          itemsWidth += $(this).outerWidth(true) + gap;
          $(this).attr("data-overflows-at", itemsWidth);
        });
        overflowsCalculated = true;
        resizeMenu();
      }
    };

    // Initialize overflows when the document is ready or loaded.
    if (
      document.readyState === "complete" ||
      document.readyState === "interactive"
    ) {
      calculateOverflows();
    } else {
      $(window).on("load", calculateOverflows);
    }

    // Recalculate overflows on window resize.
    $(window).on("resize", function () {
      if (window.innerWidth > 768) {
        itemsWidth = 0;
        overflowsCalculated = false;

        $menuItems.children().each(function () {
          itemsWidth += $(this).outerWidth(true);
          $(this).attr("data-overflows-at", itemsWidth);
        });
        overflowsCalculated = true;

        resizeMenu();
      } else {
        // Make sure to empty items in the more menu. We want to keep the UL element.
        $moreMenu.find("#more-menu-items").empty();
        $moreMenuButton.attr("data-has-items", false);
        $menuItems.find("[data-overflows]").attr("data-overflows", false);
      }
    });

    // Determines whether an element overflows, excluding the more button.
    function overflow(element, containerWidth, moreButtonWidth) {
      return element.dataset.overflowsAt > containerWidth - moreButtonWidth
        ? "more"
        : "main";
    }

    // Resizes the menu, determining which items should be in the main menu and which in the more menu.
    function resizeMenu() {
      const containerWidth = $menuItems.width();
      let collectedSet = {};

      // Collect items that overflow and those that don't.
      collectedSet = Object.groupBy(
        $menuItems.children().not("#more-menu"),
        (el) => overflow(el, containerWidth, 0),
      );

      // If there are items that overflow, run another collection to account for moreMenuButton width.
      if (collectedSet.more) {
        collectedSet = Object.groupBy(
          $menuItems.children().not("#more-menu"),
          (el) => overflow(el, containerWidth, $moreMenuButton.outerWidth()),
        );
      }

      // Append items to the main menu and more menu.
      const $moreMenuItems = $("#more-menu-items");

      if (collectedSet.more) {
        // Append items to the more menu.
        $moreMenuItems.empty().append($(collectedSet.more).clone());
        // Set state when there are items in the more menu.
        $moreMenuButton.attr("data-has-items", true);
        $(collectedSet.more).attr("data-overflows", true);
        if (collectedSet.main) {
          // Mark items that were kept in the main menu.
          $(collectedSet.main).attr("data-overflows", false);
        }
      } else {
        // Set state when there are no items in the more menu.
        $moreMenuButton.attr("data-has-items", false);
        if (collectedSet.main) {
          $(collectedSet.main).attr("data-overflows", false);
        }
        $moreMenuItems.empty();
      }
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