(function (Modules) {
  "use strict";
  var cb_selector = "#pe_filter";

  // If the problem email checkbox exists, add a click event listener
  if ($(cb_selector).length > 0) {
    $(document).on("change", cb_selector, function () {
      // use this syntax so dynamically added checbkoxes are also handled
      var $pe_checkbox = $(cb_selector);
      $pe_checkbox.attr("disabled", true);

      // parse current URL
      const queryData = new URLSearchParams(window.location.search.slice(1));

      // if the checkbox is checked, set the query parameters to filter down to permanent-failure
      if ($pe_checkbox.is(":checked")) {
        queryData.set("pe_filter", true);
        queryData.set("status", "permanent-failure");
      }
      // otherwise, remove the query parameters to show all notifications
      else {
        queryData.set("status", "");
        queryData.delete("pe_filter");
      }

      // assemble the new URL using the current URL as the base
      const newUrl = new URL(window.location.href);
      newUrl.search = queryData;
      // redirect to the new URL
      window.location.href = newUrl;
    });
  }
})(window.GOVUK.Modules);
