/**
 * Initializes the Terms of Use dialog and wires up its trigger to be used like a form field with validation.
 */
(function () {
  "use strict";

  // HTML elements
  const dialog = document.getElementById("tou-dialog");
  const terms = document.getElementById("tou-terms");

  // buttons
  const accept_button = document.getElementById("tou-accept");
  const close_button = document.getElementById("tou-close");
  const cancel_button = document.getElementById("tou-cancel");

  // form elements
  const trigger = document.getElementById("tou-dialog-trigger");
  const form_agree = document.getElementById("tou_agreed");
  const status_complete = document.getElementById("tou-complete");
  const status_not_complete = document.getElementById("tou-not-complete");
  const validation_summary = document.getElementById("validation-summary");
  
  initUI();

  /**
   * Initializes the user interface for the terms of use dialog.
   * This function sets up event listeners, hides/shows elements, and performs initial checks.
   */
  function initUI() {
    // hide complete indicator by default
    status_complete.classList.add("hidden");
    status_complete.setAttribute("aria-hidden", true);

    // if form_agree is true on load, set status indcator
    if (terms_agreed()) {
      agreeToTerms();
    }

    // if errors are displayed, add the tou error to the validation summary
    if (validation_summary && !terms_agreed()) {
      const err_msg = dialog.dataset.errorMsg;
      const err_prefix = dialog.dataset.errorPrefix;
      const error = `<a class="link:text-red text-red visited:text-red" href="#${trigger.id}"><span class="font-bold">${err_prefix}</span> ${err_msg}</a>`;
      const li = document.createElement("li");
      li.innerHTML = error;
      validation_summary.querySelector("ol").append(li);
    }

    /**
     * Event listeners
     **/

    // Show the dialog when the trigger button is clicked
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });

    // Close the dialog when the user presses ESC
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        closeModal();
      }
    });

    // Update the form and close the modal when the user agrees
    accept_button.addEventListener("click", function (e) {
      e.preventDefault();
      agreeToTerms();
    });

    // Close the modal when the user presses cancel or the X button
    [close_button, cancel_button].forEach(function (button) {
      button.addEventListener("click", function (e) {
        closeModal();
      });
    });

    // Enable the agree button when the user scrolls to the bottom
    terms.addEventListener("scroll", function () {
      if (terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5) {
        accept_button.disabled = false;
        accept_button.classList.remove("disabled");
      }
    });
  }

  function openModal() {
    document.body.style.overflow = "hidden";
    dialog.showModal();

    // if the terms dont need to be scrolled, enable the submit button and remove the disabled class
    if (
      form_agree.value === "true" ||
      terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5
    ) {
      accept_button.disabled = false;
      accept_button.classList.remove("disabled");
    } else {
      accept_button.disabled = true;
      accept_button.classList.add("disabled");
    }

    terms.focus();
  }

  function closeModal() {
    document.body.style.overflow = "auto";
    dialog.close();
  }

  function agreeToTerms() {
    console.log("terms agreed, updating status");
    form_agree.value = "true";

    // update text, add aria-hidden
    console.log("status_not_complete", status_not_complete);
    console.log("status_complete", status_complete);

    status_not_complete.classList.add("hidden");
    status_not_complete.setAttribute("aria-hidden", true);
    status_complete.classList.remove("hidden");
    status_complete.removeAttribute("aria-hidden");

    closeModal();
  }

  function terms_agreed() {
    return form_agree.value === "true";
  }
})();
