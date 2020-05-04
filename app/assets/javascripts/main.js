window.formatAllDates = function () {
  $(".local-datetime-short").each(function(index) {
    let datetime = new Date($(this).text().trim());
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";
  
    if (datetime instanceof Date && !isNaN(datetime)) {
      $(this).text(
        datetime.toLocaleString(locale, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      );
    }
  });

  $(".local-datetime-full").each(function(index) {
    let datetime = new Date($(this).text().trim());
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";
  
    if (datetime instanceof Date && !isNaN(datetime)) {
      $(this).text(
        datetime.toLocaleDateString(locale, {dateStyle: 'long'})
        + ", "
        + datetime.toLocaleTimeString(locale, {timeStyle: 'short'})
      );
    }
  });
  
  $(".relative-time-past").each(function(index) {
    let timeRaw = new Date($(this).text().trim());
    let locale = window.APP_LANG == "fr" ? "fr-CA" : "en-US";
    let time = moment(timeRaw);
  
    if (time.isValid() && window.APP_LANG) {
      let isToday = moment().isSame(time, "day");
      let dayStr = "";
      let timeStr = timeRaw.toLocaleTimeString(locale, {timeStyle: 'short'});
  
      if (isToday && window.APP_PHRASES) {
        dayStr = window.APP_PHRASES["today"];
      } else {
        dayStr = timeRaw.toLocaleDateString(locale, {dateStyle: 'long'});
      } 
  
      $(this).text(`${dayStr}, ${timeStr}`);
    }
  });
  
  // fr from here: https://github.com/rmm5t/jquery-timeago/blob/master/locales/jquery.timeago.fr.js
  // en from here: https://github.com/rmm5t/jquery-timeago/blob/master/locales/jquery.timeago.en.js
  // I removed "about"/"environ" to match the existing language returned by the python ago package
  let timeAgoSettings = {
    fr: {
      prefixAgo: "il y a",
      prefixFromNow: "d'ici",
      seconds: "moins d'une minute",
      minute: "une minute",
      minutes: "%d minutes",
      hour: "une heure",
      hours: "%d heures",
      day: "un jour",
      days: "%d jours",
      month: "un mois",
      months: "%d mois",
      year: "un an",
      years: "%d ans"
    },
    en: {
      prefixAgo: null,
      prefixFromNow: null,
      suffixAgo: "ago",
      suffixFromNow: "from now",
      seconds: "less than a minute",
      minute: "a minute",
      minutes: "%d minutes",
      hour: "an hour",
      hours: "%d hours",
      day: "a day",
      days: "%d days",
      month: "a month",
      months: "%d months",
      year: "a year",
      years: "%d years",
      wordSeparator: " ",
      numbers: []
    }
  };

  window.jQuery.timeago.settings.strings = timeAgoSettings[window.APP_LANG];
  $(() => $("time.timeago").timeago());

}



$(() => GOVUK.stickAtTopWhenScrolling.init());
$(() => GOVUK.stickAtBottomWhenScrolling.init());

window.formatAllDates();

$(".format-ua").each(function(index) {
  let text = $(this).text();
  text = text.replace(/[0-9]*\.?[0-9]+/g, "");
  text = text.replace(/\s+/g, " ").trim();
  $(this).text(text);
});

var showHideContent = new GOVUK.ShowHideContent();
showHideContent.init();

$(() => GOVUK.modules.start());

$(() =>
  $(".error-message")
    .eq(0)
    .parent("label")
    .next("input")
    .trigger("focus")
);

$(() =>
  $(".banner-dangerous")
    .eq(0)
    .trigger("focus")
);

//

(function() {
  "use strict";
  var root = this;
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
  GOVUK.cookie = function(name, value, options) {
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
  GOVUK.setCookie = function(name, value, options) {
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
  GOVUK.getCookie = function(name) {
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
}.call(this));
(function() {
  "use strict";
  var root = this;
  if (typeof root.GOVUK === "undefined") {
    root.GOVUK = {};
  }

  GOVUK.addCookieMessage = function() {};
}.call(this));
(function() {
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
      els[i].addEventListener("click", function(e) {
        // jshint ignore:line
        e.preventDefault();
        var target = document.getElementById(
            this.getAttribute("href").substr(1)
          ),
          targetClass = target.getAttribute("class") || "",
          sourceClass = this.getAttribute("class") || "";

        if (targetClass.indexOf("js-visible") !== -1) {
          target.setAttribute(
            "class",
            targetClass.replace(/(^|\s)js-visible(\s|$)/, "")
          );
        } else {
          target.setAttribute("class", targetClass + " js-visible");
        }
        if (sourceClass.indexOf("js-visible") !== -1) {
          this.setAttribute(
            "class",
            sourceClass.replace(/(^|\s)js-visible(\s|$)/, "")
          );
        } else {
          this.setAttribute("class", sourceClass + " js-visible");
        }
        this.setAttribute(
          "aria-expanded",
          this.getAttribute("aria-expanded") !== "true"
        );
        target.setAttribute(
          "aria-hidden",
          target.getAttribute("aria-hidden") === "false"
        );
      });
    }
  }
}.call(this));
