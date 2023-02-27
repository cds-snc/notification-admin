(function (Modules) {
  "use strict";

  Modules.Autocomplete = function () {
    this.start = function (component) {
      accessibleAutocomplete.enhanceSelectElement({
        displayMenu: "overlay",
        selectElement: component[0],
      });
    };
  };
})(window.GOVUK.Modules);
