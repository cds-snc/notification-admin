/**
 * Adds role and draggable attributes to all anchor elements with the class "button".
 * Allows buttons to be triggered by pressing the space key.
 */
(function () {
  "use strict";

  /**
   * Adds attributes and keydown listener
   * @param {HTMLElement} button - The button element.
   */
  document.querySelectorAll("a.button").forEach((button) => {
    button.setAttribute("role", "button");
    button.setAttribute("draggable", "false");

    button.addEventListener('keydown', (event) => {
      if (event.key === ' ') {
        event.preventDefault();
        button.click();
      }
    });
  });
})();
