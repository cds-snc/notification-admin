/**
 * Initializes the Terms of Use dialog and adds event listeners.
 */
(function () {
  "use strict";

  // HTML elements
  const dialog = document.getElementById("tou-dialog");
  const err_msg = document.getElementById("terms-error");
  const terms = document.getElementById("tou-terms");
  const accept = document.getElementById("tou-accept");
  const form = document.querySelector("#tou-dialog form");
  const trigger = document.getElementById("tou-dialog-trigger");
  const form_agree = document.querySelector("input[name='tou_agreed']");
  const close_button = document.getElementById("tou-close");
  const status = document.getElementById("tou-status");

  // Close the dialog when the user clicks outside of it
  // dialog.addEventListener('mousedown', function(event) {
  //   // Check if the click event's target is the dialog itself
  //   if (event.target === dialog) {
  //     // If it is, close the dialog
  //     closeModal();
  //   }
  // });

  // Show the dialog when the trigger button is clicked
  trigger.addEventListener("click", function () {
    openModal();
  });

  // If the user tries to close the dialog using the escape key, show a message
  // that the terms must be accepted before dismissing the dialog
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
      closeModal();
    }
  });

  // Add agree button click listener that closes the modal and sets the form_agree value to true
  accept.addEventListener("click", function (e) {
    form_agree.value = "true";
    status.querySelector("i").classList.remove('fa-x').add('fa-check');
    closeModal();
  });

  // Add close button click listener that closes the modal
  close_button.addEventListener("click", function (e) {
    closeModal();
  });

  // add event handler that enables submit button when the user has scrolled to the bottom of #tou-terms
  terms.addEventListener("scroll", function () {
    // set disabled=true and remove class disabled when div is fully scrolled
    if (terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5) {
      accept.disabled = false;
      accept.classList.remove("disabled");
    }
  });

  function set_trigger_focus() {
    trigger.focus();
  }

  function openModal() {
    document.body.style.overflow = "hidden";
    dialog.showModal();

    // if the terms dont need to be scrolled, enable the submit button and remove the disabled class
    if (
      form_agree.value === "true" ||
      terms.scrollHeight - terms.scrollTop <= terms.clientHeight + 5
    ) {
      accept.disabled = false;
      accept.classList.remove("disabled");
    } else {
      accept.disabled = true;
      accept.classList.add("disabled");
    }

    terms.focus();
  }

  function closeModal() {
    document.body.style.overflow = "auto";
    dialog.close();
    set_trigger_focus();
  }
})();
