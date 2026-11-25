(function (window, document) {
  "use strict";

  // Sends a `dashboard_click` GA event for links inside elements marked with
  // `data-ga-section`. The listener is delegated on the document so it keeps
  // working after the dashboard's AJAX blocks replace their content.
  function trackDashboardClick(event) {
    if (typeof window.gtag === "undefined") return;

    var target = event.target;
    if (!target || typeof target.closest !== "function") return;

    var link = target.closest("a[href]");
    if (!link) return;

    var sectionEl = link.closest("[data-ga-section]");
    if (!sectionEl) return;

    var itemEl = link.closest("[data-ga-item]");

    window.gtag("event", "dashboard_click", {
      section: sectionEl.getAttribute("data-ga-section"),
      item: itemEl ? itemEl.getAttribute("data-ga-item") : undefined,
      language: document.documentElement.lang || "en",
      transport_type: "beacon",
    });
  }

  document.addEventListener("click", trackDashboardClick, true);

  window.GOVUK = window.GOVUK || {};
  window.GOVUK.trackDashboardClick = trackDashboardClick;
})(window, document);
