(function (Modules) {
  "use strict";

  const registerKeyDownEscape = window.utils.registerKeyDownEscape;

  function open($menu, $items) {
    // show menu
    if (!this.hasFocus) {
      $items.toggleClass("hidden", false);
      $items.removeClass("opacity-0");
      $items.addClass("opacity-100");
      setFocusToFirstItem($items);
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", true);
      }
      $menu.attr("aria-expanded", true);
      this.hasFocus = true;
    }
  }

  function close($menu, $items) {
    // hide menu if open
    if (this.hasFocus) {
      $items.toggleClass("hidden", true);
      $items.removeClass("opacity-100");
      $items.addClass("opacity-0");
      const $arrow = $menu.find(".arrow");
      if ($arrow.length > 0) {
        $arrow.toggleClass("flip", false);
      }
      $menu.attr("aria-expanded", false);
      this.hasFocus = false;
    }
  }

  function toggleMenu($menu, $items) {
    const show = $items.hasClass("hidden");

    // Show the menu..
    if (show) {
      open($menu, $items);
    }
    // Hide the menu..
    else {
      close($menu, $items);
    }
  }

  function setFocusToLastItem($items) {
    const $menuItems = $items.children("[role='menuitem']");

    $menuItems.last().focus();
  }
  function setFocusToFirstItem($items) {
    const $menuItems = $items.children("[role='menuitem']");

    $menuItems.first().focus();
  }

  function setFocusToNextItem($items, $current) {
    const $menuItems = $items.children("[role='menuitem']");
    const i = $current.index();
    $menuItems.eq(i + 1 === $menuItems.length ? 0 : i + 1).focus();
  }
  function setFocusToPreviousItem($items, $current) {
    const $menuItems = $items.children("[role='menuitem']");
    const i = $current.index();
    $menuItems.eq(i - 1 === -1 ? $menuItems.length - 1 : i - 1).focus();
  }

  function init($menu) {
    const itemsId = "#" + $menu.attr("data-menu-items");
    const $items = $(itemsId);
    const $menuItems = $items.children("[role='menuitem']");

    $menu.click(() => toggleMenu($menu, $items));
    registerKeyDownEscape($items, () => close($menu, $items));
    $("body").click((e) => {
      if (e.target != $menu[0]) {
        close($menu, $items);
      }
    });
    // Key handlers for menubutton
    $menu.keydown((e) => {
      let flag = false;
      switch (e.code) {
        case "Enter":
        case "Space":
        case "ArrowDown":
          if ($menu) {
            open($menu, $items);
            flag = true;
          }
          break;
        case "ArrowUp":
          if ($menu) {
            open($menu, $items);
            setFocusToLastItem($items);
            flag = true;
          }
          break;
        case "Escape":
        case "Tab":
          close($menu, $items);
          break;
        default:
          break;
      }
      if (flag) {
        e.stopPropagation();
        e.preventDefault();
      }
    });

    //Key handlers for menu items
    $menuItems.keydown((e) => {
      let flag = false;
      switch (e.code) {
        case "ArrowDown":
          setFocusToNextItem($items, $(e.target));
          flag = true;
          break;
        case "ArrowUp":
          setFocusToPreviousItem($items, $(e.target));
          flag = true;
          break;
        case "Escape":
        case "Tab":
          close($menu, $items);
          break;
        default:
          break;
      }
      if (flag) {
        e.stopPropagation();
        e.preventDefault();
      }
    });
  }

  Modules.Menu = function () {
    this.menuItems = [];
    this.firstItem = null;
    this.lastItem = null;
    this.hasFocus = false;

    this.start = function (component) {
      let $component = $(component);
      init($component);
    };
  };
})(window.GOVUK.Modules);
