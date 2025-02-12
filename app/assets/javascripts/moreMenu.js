(function (Modules) {
  "use strict";

  var elemWidth = 0,
    fitCount = 0,
    varWidth = 1,
    ctr = 0,
    $moreMenu = null,
    $menuContainer = null,
    $menuItems = null,
    collectedSet = [],
    overflowsCalculated = false;

  function menuToggle($moreMenu, $menuContainer, $arrow) {
    const show = $menuContainer.hasClass("hidden");
    $moreMenu.attr("aria-expanded", show);

    $menuContainer.toggleClass("hidden");
    if ($arrow) $arrow.attr("data-fa-transform", show ? "rotate-180" : "");
  }

  function init($menu) {
    $moreMenu = $menu;
    const menuItemsId = "#" + $moreMenu.attr("data-module-menu-items");
    const menuContainerId = "#" + $moreMenu.attr("data-module-menu-container");

    $menuItems = $(menuItemsId);
    $menuContainer = $(menuContainerId);
    $moreMenu.click(() =>
      menuToggle($moreMenu, $menuContainer, $moreMenu.find(".icon")),
    );

    // Take the number of menu items and calculate individual outer width
    // of each one.
    ctr = $menuItems.children().length;
    // $menuItems.children().each(function (e) {
    //   // true includes margin
    //   varWidth += $(this).outerWidth(true);
    //   $(this).attr("data-overflows-at", varWidth);
    // });
    // Making sure varWidth is never 0
    // varWidth = varWidth || 1;

    const calculateOverflows = () => {
      if (window.innerWidth > 768) {
        $menuItems.children().each(function (e) {
          // true includes margin
          varWidth += $(this).outerWidth(true);
          $(this).attr("data-overflows-at", varWidth);
        });
        overflowsCalculated = true;
        resizeMenu();
      }
    };

    // Trigger when the document is ready.
    if (document.readyState === 'complete') {
      calculateOverflows();
    } else {
      $(window).on("load", calculateOverflows);
    }

    // Trigger when resizing/reorienting the device.
    $(window).on("resize", function () {
      if (window.innerWidth > 768) {
        $menuItems.addClass("hidden");
        if (!overflowsCalculated) {
          $menuItems.children().each(function (e) {
            // true includes margin
            varWidth += $(this).outerWidth(true);
            $(this).attr("data-overflows-at", varWidth);
          });
          overflowsCalculated = true;
        }
        resizeMenu();
      } else {
        $menuContainer.empty();
        $moreMenu.attr("data-has-items", false);
        if (collectedSet.more) {
          $(collectedSet.more).attr("data-overflows", false);
        }
        $(collectedSet.main).attr("data-overflows", false);
      }
    });
  }

  // Util function to group nav items in the main nav or the more nav
  const overflow = (el) => {
    console.log(
      el.dataset.overflowsAt,
      elemWidth,
      elemWidth - $moreMenu.outerWidth(),
    );
    return el.dataset.overflowsAt > elemWidth ? "more" : "main";
  };

  const overflowMore = (el) => {
    console.log(
      el.dataset.overflowsAt,
      elemWidth,
      $moreMenu.outerWidth(),
      "=",
      elemWidth - $moreMenu.outerWidth(),
    );

    return el.dataset.overflowsAt > elemWidth - $moreMenu.outerWidth()
      ? "more"
      : "main";
  };

  function resizeMenu() {
    // Current available width of the menu.
    elemWidth = $menuItems.width();

    // Filter menuItems by data-overflows-at attribute
    collectedSet = Object.groupBy(
      $menuItems.children().not("#more-menu"),
      overflow,
    );
    console.log(collectedSet);

    if (collectedSet.more) {
      //Re-collect menu items now that at the "more" menu takes up space
      collectedSet = Object.groupBy(
        $menuItems.children().not("#more-menu"),
        overflowMore,
      );
      console.log(collectedSet);
    }

    //

    // Calculate how many items fit on the total width.
    // Substract 1 as CSS :gt property is 0-based index.
    // Substract another one to account for the "Plus" item
    // fitCount = Math.floor((elemWidth / varWidth) * ctr) - 2;

    // Reset display and width on all menu items.
    // $menuItems.children().css({ display: "flex", width: "auto" });
    // $(collectedSet.main).css({ display: "flex", width: "auto" });

    // Get the menu items that don't fit in the limited space, if any,
    // make sure to exclude the 'More' menu itself though.
    // collectedSet = $menuItems
    //   .children(":gt(" + fitCount + ")")
    //   .not("#more-menu");

    // Empty the more menu and add the out of space menu items in
    // a special set.
    var $moreMenuItems = $("<ul/>").attr("id", "more-menu-items").addClass(
      "menu-overlay absolute right-0 text-right empty:hidden w-max top-full",
      // "absolute right-0 flex flex-col flex-shrink-0 text-right bg-gray divide-y divide-gray-grey2 shadow z-50"
    );
    $menuContainer.html($moreMenuItems);

    // Remember the display and width of the More menu.
    // var moreMenuDisplay = $moreMenu.css("display");
    // var moreMenuWidth = $moreMenu.css("width");

    if (collectedSet.more) {
      // Reset state on resize invocation.
      $moreMenuItems.empty().append($(collectedSet.more).clone());
      // $moreMenu.removeClass("hidden");
      // More menu button
      $moreMenu.attr("data-has-items", true);
      $(collectedSet.more).attr("data-overflows", true);
      $(collectedSet.main).attr("data-overflows", false);
      // Hide items in the collection, because these sub-menus are not visible
      // in the menu anymore.
      // $(collectedSet.more).css({ display: "none", width: "0" });
      // Make sure we are displaying the More menu when it contains items.
      // $moreMenu.css({ display: "flex", width: "auto" });
      // Need to adjust re-alignment..
      // $moreMenuItems.children().removeClass();
      // $moreMenuItems.children().addClass("text-right px-5");
      // $moreMenuItems
      //   .find(".header--active")
      //   .removeClass("header--active")
      //   .parent()
      //   .addClass("menu--active");
    } else {
      // Hide the More menu when it does not contain item(s).
      $moreMenu.attr("data-has-items", false);
      $(collectedSet.main).attr("data-overflows", false);
      $moreMenu.addClass("hidden");
    }
  }

  Modules.MoreMenu = function () {
    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
