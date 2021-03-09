(function (Modules) {
  "use strict";

  var elemWidth = 0,
    fitCount = 0,
    varWidth = 1,
    ctr = 0,
    $moreMenu = null,
    $menuContainer = null,
    $menuItems = null,
    collectedSet = [];

  function menuToggle($menuContainer, $arrow) {
    $menuContainer.toggleClass("hidden");
    if ($arrow) $arrow.toggleClass("flip");
    $menuContainer.find("a")[0].focus();
  }

  function init($menu) {
    $moreMenu = $menu;
    const menuItemsId = "#" + $moreMenu.attr("data-module-menu-items");
    const menuContainerId = "#" + $moreMenu.attr("data-module-menu-container");

    $menuItems = $(menuItemsId);
    $menuContainer = $(menuContainerId);
    $moreMenu.click(() => menuToggle($menuContainer, $moreMenu.find(".arrow")));

    // Take the number of menu items and calculate individual outer width
    // of each one.
    ctr = $menuItems.children().length;
    $menuItems.children().each(function () {
      varWidth += $(this).outerWidth();
    });
    // Making sure varWidth is never 0
    varWidth = varWidth || 1;

    resizeMenu();
    $(window).resize(function () {
      resizeMenu();
    });
  }

  function resizeMenu() {
    // Current available width of the menu.
    elemWidth = $menuItems.width();

    // Calculate how many items fit on the total width.
    // Substract 1 as CSS :gt property is 0-based index.
    fitCount = Math.floor((elemWidth / varWidth) * ctr) - 1;

    // Reset display and width on all menu items.
    $menuItems.children().css({ display: "block", width: "auto" });

    // Get the menu items that don't fit in the limited space, if any,
    // make sure to exclude the 'More' menu itself though.
    collectedSet = $menuItems
      .children(":gt(" + fitCount + ")")
      .not("#more-menu");

    // Empty the more menu and add the out of space menu items in
    // a special set.
    var $moreMenuItems = $("<div/>")
      .attr("id", "more-menu-items")
      .addClass(
        "absolute right-0 flex flex-col flex-shrink-0 text-right bg-gray mr-24"
      );
    $menuContainer.html($moreMenuItems);

    // Remember the display and width of the More menu.
    var moreMenuDisplay = $moreMenu.css("display");
    var moreMenuWidth = $moreMenu.css("width");

    // Reset state on resize invocation.
    $moreMenuItems.empty().append(collectedSet.clone());
    $moreMenu.removeClass("hidden");

    if (collectedSet.length > 0) {
      // Hide items in the collection, because these sub-menus are not visible
      // in the menu anymore.
      collectedSet.css({ display: "none", width: "0" });
      // Make sure we are displaying the More menu when it contains items.
      $moreMenu.css({ display: moreMenuDisplay, width: moreMenuWidth });
      // Need to adjust re-alignment..
      $moreMenuItems.children().removeClass("text-center");
      $moreMenuItems.children().addClass("text-right");
      $moreMenuItems.find(".header--active")
        .addClass("menu--active")
        .removeClass("header--active");

      const divider = $("<div/>")
        .addClass("w-full pr-5")
        .append($("<div/>").addClass("float-right menu-divider"));
      let $currentItem = $moreMenuItems.children().first();
      const dividerCount = $moreMenuItems.children().length - 1;
      for (var idx = 0; idx < dividerCount; idx++) {
        const $nextItem = $currentItem.next();
        divider.clone().insertAfter($currentItem);
        $currentItem = $nextItem;
      }
    } else {
      // Hide the More menu when it does not contain item(s).
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
