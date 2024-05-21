/**
 * Initializes the Terms of Use dialog and adds event listeners.
 */
(function (Modules) {
  "use strict";

  // HTML elements
  const dialog = document.getElementById("tou-dialog");
  const err_msg = document.getElementById("terms-error");

  // Show the dialog when this script loads
  dialog.showModal();

  // If the user tries to close the dialog using the escape key, show a message
  // that the terms must be accepted before dismissing the dialog
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      err_msg.classList.remove("hidden");
      err_msg.focus();

      event.preventDefault();
    }
  });

  // Add form submit event listener that unhides spinner
  document.querySelector("dialog form").addEventListener("submit", function () {
    const spinner = document.querySelector("dialog svg");
    spinner.classList.remove("hidden");
  });
})();
