window.formatAllDates = function () {
  $(".local-datetime-short").each(function (index) {
    let datetimeRaw = $(this).text().trim();
    let datetime = new Date(datetimeRaw);
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";

    if (datetime instanceof Date && !isNaN(datetime)) {
      $(this)
        .attr("datetime", datetimeRaw)
        .text(
          datetime.toLocaleString(locale, {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
        );
    }
  });

  $(".local-datetime-short-year").each(function (index) {
    let datetimeRaw = $(this).text().trim();
    let datetime = new Date(datetimeRaw);
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";

    if (datetime instanceof Date && !isNaN(datetime)) {
      $(this)
        .attr("datetime", datetimeRaw)
        .text(
          datetime.toLocaleString(locale, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        );
    }
  });

  $(".local-datetime-full").each(function (index) {
    let datetimeRaw = $(this).text().trim();
    let datetime = new Date(datetimeRaw);
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";

    if ($(this).text().trim() === "None") {
      $(this).text(window.APP_PHRASES["never"]);
    }

    if (datetime instanceof Date && !isNaN(datetime)) {
      $(this)
        .attr("datetime", datetimeRaw)
        .text(
          datetime.toLocaleDateString(locale, { dateStyle: "long" }) +
            ", " +
            datetime.toLocaleTimeString(locale, { timeStyle: "short" }),
        );
    }
  });

  $(".relative-time-past").each(function (index) {
    let datetimeRaw = $(this).text().trim();
    let datetime = new Date($(this).text().trim());
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";
    let time = moment(datetime);

    if (time.isValid() && window.APP_LANG) {
      let isToday = moment().isSame(time, "day");
      let dayStr = "";
      let timeStr = datetime.toLocaleTimeString(locale, { timeStyle: "short" });

      if (isToday && window.APP_PHRASES) {
        dayStr = window.APP_PHRASES["today"];
      } else {
        dayStr = datetime.toLocaleDateString(locale, { dateStyle: "long" });
      }

      $(this).attr("datetime", datetimeRaw).text(`${dayStr}, ${timeStr}`);
    }
  });
};

$(() => GOVUK.stickAtTopWhenScrolling.init());
$(() => GOVUK.stickAtBottomWhenScrolling.init());

window.formatAllDates();

$(".format-ua").each(function (index) {
  let text = $(this).text();
  text = text.replace(/[0-9]*\.?[0-9]+/g, "");
  text = text.replace(/\s+/g, " ").trim();
  $(this).text(text);
});

var showHideContent = new GOVUK.ShowHideContent();
showHideContent.init();

$(() => GOVUK.modules.start());

$(() =>
  $(".error-message").eq(0).parent("label").next("input").trigger("focus"),
);

$(() => $(".banner-dangerous").eq(0).trigger("focus"));

//

(function () {
  "use strict";
  var root = this || window;
  if (typeof root.GOVUK === "undefined") {
    root.GOVUK = {};
  }

  /*
      Cookie methods
      ==============

      Usage:

        Setting a cookie:
        GOVUK.cookie('hobnob', 'tasty', { days: 30 });

        Reading a cookie:
        GOVUK.cookie('hobnob');

        Deleting a cookie:
        GOVUK.cookie('hobnob', null);
    */
  GOVUK.cookie = function (name, value, options) {
    if (typeof value !== "undefined") {
      if (value === false || value === null) {
        return GOVUK.setCookie(name, "", { days: -1 });
      } else {
        return GOVUK.setCookie(name, value, options);
      }
    } else {
      return GOVUK.getCookie(name);
    }
  };
  GOVUK.setCookie = function (name, value, options) {
    if (typeof options === "undefined") {
      options = {};
    }
    var cookieString = name + "=" + value + "; path=/";
    if (options.days) {
      var date = new Date();
      date.setTime(date.getTime() + options.days * 24 * 60 * 60 * 1000);
      cookieString = cookieString + "; expires=" + date.toGMTString();
    }
    if (document.location.protocol == "https:") {
      cookieString = cookieString + "; Secure";
    }
    document.cookie = cookieString;
  };
  GOVUK.getCookie = function (name) {
    var nameEQ = name + "=";
    var cookies = document.cookie.split(";");
    for (var i = 0, len = cookies.length; i < len; i++) {
      var cookie = cookies[i];
      while (cookie.charAt(0) == " ") {
        cookie = cookie.substring(1, cookie.length);
      }
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    return null;
  };
}).call(this);
(function () {
  "use strict";
  var root = this || window;
  if (typeof root.GOVUK === "undefined") {
    root.GOVUK = {};
  }

  GOVUK.addCookieMessage = function () {};
}).call(this);
(function () {
  "use strict";

  // add cookie message
  if (window.GOVUK && GOVUK.addCookieMessage) {
    GOVUK.addCookieMessage();
  }

  // header navigation toggle
  if (document.querySelectorAll && document.addEventListener) {
    var els = document.querySelectorAll(".js-header-toggle"),
      i,
      _i;
    for (i = 0, _i = els.length; i < _i; i++) {
      els[i].addEventListener("click", function (e) {
        // jshint ignore:line
        e.preventDefault();
        var target = document.getElementById(
            this.getAttribute("href").substr(1),
          ),
          targetClass = target.getAttribute("class") || "",
          sourceClass = this.getAttribute("class") || "";

        if (targetClass.indexOf("js-visible") !== -1) {
          target.setAttribute(
            "class",
            targetClass.replace(/(^|\s)js-visible(\s|$)/, ""),
          );
        } else {
          target.setAttribute("class", targetClass + " js-visible");
        }
        if (sourceClass.indexOf("js-visible") !== -1) {
          this.setAttribute(
            "class",
            sourceClass.replace(/(^|\s)js-visible(\s|$)/, ""),
          );
        } else {
          this.setAttribute("class", sourceClass + " js-visible");
        }
        this.setAttribute(
          "aria-expanded",
          this.getAttribute("aria-expanded") !== "true",
        );
        target.setAttribute(
          "aria-hidden",
          target.getAttribute("aria-hidden") === "false",
        );
      });
    }
  }
}).call(this);

// Report form handler - prevents page reload and shows spinner immediately
(function() {
  "use strict";

  document.addEventListener('DOMContentLoaded', function() {
    // Find forms containing the "Prepare report" button
    const reportForms = document.querySelectorAll('form button[name="generate-report"]');
    
    if (reportForms.length === 0) return;

    reportForms.forEach(button => {
      const form = button.closest('form');
      if (!form) return;
      
      // Track submission state to prevent double submissions
      let isSubmitting = false;
      
      // Add click handler to immediately disable the button
      button.addEventListener('click', function(e) {
        if (isSubmitting) {
          e.preventDefault();
          return false;
        }
        // Visual feedback - disable immediately
        button.disabled = true;
      });

      form.addEventListener('submit', function(event) {
        if (event.submitter && event.submitter.name === 'generate-report') {
          event.preventDefault();
          
          // Prevent double submissions
          if (isSubmitting) return false;
          isSubmitting = true;
          
          // Disable the button (redundant but ensures it's disabled)
          button.disabled = true;
          
          // Show the loading spinner immediately
          const reportFooterContainer = document.querySelector('.report-footer-container');
          if (reportFooterContainer) {
            const spinnerContainer = document.createElement('div');
            spinnerContainer.className = 'loading-spinner-large';
            reportFooterContainer.querySelector('.flex-grow-0').prepend(spinnerContainer);
          }
          
          // Get the form data
          const formData = new FormData(form);
          
          // Make sure we're passing the generate-report button name and value
          formData.append('generate-report', '');
          
          // Make the AJAX request
          fetch(form.action, {
            method: 'POST',
            body: formData,
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              // Don't set Content-Type header - let the browser set it with boundary for multipart/form-data
            },
            credentials: 'same-origin' // Include cookies for session authentication
          }).then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            // The ajax-block will automatically update with the new report totals
            // via its polling mechanism
            button.disabled = false;
            isSubmitting = false;

          }).catch(error => {
            console.error('Error preparing report:', error);
            // Re-enable the button if there was an error
            button.disabled = false;
            isSubmitting = false;
            
            // Remove the spinner if there was an error
            if (reportFooterContainer) {
              const spinner = reportFooterContainer.querySelector('.loading-spinner-large');
              if (spinner) spinner.remove();
            }
          });
        }
      });
    });
  });
})();
