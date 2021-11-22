(function (Modules) {
  "use strict";

  Modules.RecaptchaLanguage = function () {
    this.start = () => {
      $(window).on("load", this.changeLanguage);
    };

    this.changeLanguage = () => {
      const container = document.getElementById("captcha_container");
      if (container) {
        const iframeGoogleCaptcha = container.querySelector("iframe");
        const actualLang = iframeGoogleCaptcha
          .getAttribute("src")
          .match(/hl=(.*?)&/)
          .pop();

        // For setting new language
        if (actualLang !== window.APP_LANG) {
          iframeGoogleCaptcha.setAttribute(
            "src",
            iframeGoogleCaptcha
              .getAttribute("src")
              .replace(/hl=(.*?)&/, "hl=" + window.APP_LANG + "&")
          );
        }
      }
    };
  };
})(window.GOVUK.Modules);
