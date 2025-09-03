(function (Modules) {
  "use strict";

  Modules.Autofocus = function () {
    this.start = function (component) {
      var forceFocus = $(component).data("forceFocus");

      // if the page loads with a scroll position, we can't assume the item to focus onload
      // is still where users intend to start
      if ($(window).scrollTop() > 0 && !forceFocus) {
        return;
      }

      // prevent more than 1 component from being focused. 
      // only focus on page load when nothing is focused yet. 
      // if something is already focused, we don't want to change that.
      if ($(":focus").length > 0) {
        return;
      }

      // focus the first input, textarea or select element within the component
      $("input, textarea, select", component).eq(0).trigger("focus");
    };
  };
})(window.GOVUK.Modules);
