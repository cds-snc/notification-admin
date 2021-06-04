(function (Modules) {
  "use strict";

  let normalize = (string) => string.toLowerCase().replace(/ /g, "");

  let filter = ($searchBox, $targets) => () => {
    let query = normalize($searchBox.val());

    $targets.each(function () {
      let content = $(".live-search-relevant", this).text() || $(this).text();

      if ($(this).has(":checked").length) {
        $(this).show();
        return;
      }

      if (query == "") {
        $(this).css("display", "");
        return;
      }

      $(this).toggle(normalize(content).indexOf(normalize(query)) > -1);
    });

    // make sticky JS recalculate its cache of the element's position
    // because live search can change the height document
    if ("stickAtBottomWhenScrolling" in GOVUK) {
      GOVUK.stickAtBottomWhenScrolling.recalculate();
    }
  };

  Modules.LiveSearch = function () {
    this.start = function (component) {
      let $component = $(component);

      let $searchBox = $("input", $component);

      let filterFunc = filter($searchBox, $($component.data("targets")));

      $searchBox.on("keyup input", filterFunc);

      filterFunc();
    };
  };
})(window.GOVUK.Modules);
