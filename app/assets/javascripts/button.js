(function (Modules) {
  "use strict";

  Modules.Button = function () {
    this.start = function (component) {
      /** Handle links that look like buttons
       *
       * - JavaScript makes the space key activate the link
       * - role="button" is added to the link so that it’s recognised and announced as button by voice dictation and screen reader software.
       * - draggable="false" is added to the link so that people with dexterity impairments don’t accidentally drag the link instead of cliking it.
       */

      // Listen to keydown on component
      $(component).on("keydown", (event) => {
        let target = event.target;

        // If role is a button, and SPACE is pressed...
        if (target.getAttribute("role") === "button" && event.key === " ") {
          // Prevent default (scroll down), and click the button.
          event.preventDefault();
          target.click();
        }
      });
    };
  };
})(window.GOVUK.Modules);
