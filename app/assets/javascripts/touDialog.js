/**
 * Initializes the Terms of Use dialog and adds event listeners.
 */
(function (Modules) {
  "use strict";

  // HTML elements
  const dialog = document.getElementById("tou-dialog");
  const err_msg = document.getElementById("terms-error");
  const terms = document.getElementById("tou-terms");
  const accept = document.getElementById("tou-accept");
  const form = document.querySelector("#tou-dialog form");
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
  form.addEventListener("submit", function () {
    const spinner = document.querySelector("dialog svg");
    spinner.classList.remove("hidden");
  });

  // if the terms dont need to be scrolled, enable the submit button and remove the disabled class
  if (terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5) {
    accept.disabled = false;
    accept.classList.remove("disabled");
  }

  // add event handler that enables submit button when the user has scrolled to the bottom of #tou-terms
  terms.addEventListener("scroll", function () {
    // set disabled=true and remove class disabled when div is fully scrolled
    if (terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5) {
      accept.disabled = false;
      accept.classList.remove("disabled");
    }
  });
})();
