(function (Modules) {
  "use strict";

  let normalize = (string) => string.toLowerCase().replace(/ /g, "");

  // Debounce utility function
  let debounce = (func, delay) => {
    let timeoutId;
    return function (...args) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
  };

  let updateAriaLiveStatus = ($targets, query) => {
    let visibleCount = $targets.filter(":visible").length;
    let statusElement = $("#template-list-status");

    if (statusElement) {
      if (query === "") {
        statusElement.text(`${$targets.length} templates found`);
      } else {
        statusElement.text(`${visibleCount} templates found`);;
      }
    }
  };

  let filter = ($searchBox, $targets) => {
    let immediateFilter = () => {
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

    let debouncedAriaUpdate = debounce(() => {
      let query = $searchBox.val().trim();
      updateAriaLiveStatus($targets, query);
    }, 1000);

    return () => {
      // Immediate visual filtering
      immediateFilter();
      // Delayed aria-live announcement to ensure that:
      // 1. The user isn't overwhelmed with announcements
      // 2. The filtered results announcement isn't skipped by the subsequent re-announcement of the
      //    search textbox content / currently focused element
      debouncedAriaUpdate();
    };
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
