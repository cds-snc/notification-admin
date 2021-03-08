(function(Modules) {
  "use strict";

  function safeAddEventListener(selector, event, fn) {
    if (document.querySelector(selector))
      document.querySelector(selector).addEventListener(event, fn)
  }

  function registerMenuEscape(selector, toggleFn) {
    document.addEventListener("keydown", function (e) {
      if (e.key == 'Escape') {
        var opened = document.querySelector(selector + ':not(.hidden)')
        if (opened) toggleFn()
      }
    })
  }

  const focusableElements =
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

  /**
   * Registers a scope around the given menu selector.
   *
   * The given menu selector will get the TAB navigation entrapped within its
   * container's focusable elements, hence creating a navigation scope around
   * it. This will only apply to the container itself and will not hinder
   * other elements of the page as long as the container is not reached. This
   * works well within a modal popup that took focus away from the main window.
   */
  function registerTabNavigationScope(menuSelector) {
    const modal = document.querySelector(menuSelector)
    if (!modal) {
      return;
    }
    const firstFocusableElement = modal.querySelectorAll(focusableElements)[0]
    const focusableContent = modal.querySelectorAll(focusableElements)
    const lastFocusableElement = focusableContent[focusableContent.length - 1]

    document.addEventListener('keydown', function (e) {
      let isTabPressed = e.key === 'Tab' || e.keyCode === 9

      if (!isTabPressed) {
        return
      }

      if (e.shiftKey) { // if shift key pressed for shift + tab combination
        if (document.activeElement === firstFocusableElement) {
          lastFocusableElement.focus() // add focus for the last focusable element
          e.preventDefault()
        }
      } else { // if tab key is pressed
        if (document.activeElement === lastFocusableElement) { // if focused has reached to last focusable element then focus first focusable element after pressing tab
          firstFocusableElement.focus() // add focus for the first focusable element
          e.preventDefault()
        }
      }
    })

    firstFocusableElement.focus()
  }

  function menuMobileToggle() {
    const nav = document.querySelector(".mobile-nav")
    const arrow = document.querySelector(".mobile-arrow")
    nav.classList.toggle("hidden")
    arrow.classList.toggle("flip")
    nav.querySelector('a').focus()
  }

  function menuToggle($menu, $arrow) {
    $menu.toggleClass("hidden")
    if ($arrow) $arrow.toggleClass("flip")
    $menu.find("a").focus()
  }

  function accountMobileToggle() {
    const accountMenu = document.querySelector("#account-menu-mobile")
    accountMenu.classList.toggle("hidden")
    accountMenu.querySelector('a').focus()
    // In order to have the opacity transition effect working properly,
    // we need to separate the hidden and opacity toggling in two separate
    // actions in the HTML rendering, hence the delay of opacity by 1 ms.
    window.setTimeout(function () {
      accountMenu.classList.toggle("opacity-0")
      accountMenu.classList.toggle("pointer-events-none")
    }, 1)
  }

  function accountMenuToggle() {
    const accountMenu = document.querySelector("#account-menu-options")
    const arrow = document.querySelector(".account-menu-arrow")
    accountMenu.classList.toggle("hidden")
    arrow.classList.toggle("flip")
    accountMenu.querySelector('a').focus()
  }

  function init($menu) {
    safeAddEventListener("#menu", "click", menuMobileToggle)
    registerMenuEscape(".mobile-nav", menuMobileToggle)

    safeAddEventListener("#account-icon-mobile", "click", accountMobileToggle)
    safeAddEventListener("#account-close-mobile", "click", accountMobileToggle)
    registerMenuEscape("#account-menu-mobile", accountMobileToggle)

    safeAddEventListener("#account-menu", "click", accountMenuToggle)
    registerMenuEscape("#account-menu-options", accountMenuToggle)
    registerTabNavigationScope('#account-menu-mobile')

    safeAddEventListener(
      "#more-menu",
      "click",
      () => menuToggle($("#more-menu-container"), $("#more-menu").find(".arrow"))
    )

    var ctx = {
      elemWidth: 0,
      fitCount: 0, 
      varWidth: 0,
      ctr: 0,
      $menuItems: $("#proposition-links"),
      collectedSet: []
    };

    // Take the number of menu items and calculate individual outer width
    // of each one.
    ctx.ctr = ctx.$menuItems.children().length;
    ctx.$menuItems.children().each(function() {
      ctx.varWidth += $(this).outerWidth();
    });

    resizeMenu(ctx); 
    $(window).resize(function() {
      resizeMenu(ctx);
    });
  }

  function resizeMenu(ctx) {
    // Current available width of the menu.
    ctx.elemWidth = ctx.$menuItems.width();

    // Calculate how many items fit on the total width.
    // Substract 1 as this is 0-based index.
    ctx.fitCount = Math.floor((ctx.elemWidth / ctx.varWidth) * ctx.ctr) - 1;

    // Reset display and width on all menu items.
    ctx.$menuItems.children().css({"display": "block", "width": "auto"});

    // Get the menu items that don't fit in the limited space, if any,
    // make sure to exclude the 'More' menu itself though.
    ctx.collectedSet = ctx.$menuItems
      .children(":gt(" + ctx.fitCount + ")")
      .not("#more-menu");

    // Empty the more menu and add the out of space menu items in 
    // a special set.
    var moreMenu = $("#more-menu");
    var moreMenuItems = $("#more-menu-items");
    var moreMenuDisplay = moreMenu.css("display");
    var moreMenuWidth = moreMenu.css("width");
    moreMenuItems.empty().append(ctx.collectedSet.clone());
    moreMenu.removeClass("hidden");

    if (ctx.collectedSet.length > 0) {
      // Set display to none and width to 0 on collection, because these sub
      // menus are not visible in the menu anymore.
      ctx.collectedSet.css({"display": "none", "width": "0"});
      // Make sure we are displaying the More menu when it contains items.
      moreMenu.css({"display": moreMenuDisplay, "width": moreMenuWidth});
      moreMenuItems.children().removeClass("text-center");
      moreMenuItems.children().addClass("text-right");
    } else {
      // Hide the More menu when it does not contain item(s).
      moreMenu.addClass("hidden");
    }
  }

  Modules.NavMenu = function() {
    this.start = function(component) {
      let $component = $(component);
      init($component);
    }
  }
})(window.GOVUK.Modules);
