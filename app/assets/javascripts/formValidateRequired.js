/**
 * This script is used to validate forms. It loops over any forms on the page with the `data-validate-required` attribute
 * and validates each descendant input that has a `required` attribute.
 *
 * When a form is submitted, it ensures all fields marked `required` have values and prevents the form from being submitted
 * if not. It also validates each field whenever its value changes.
 **/
(function () {
  "use strict";

  // loop over all forms with the 'data-validate-required' attribute
  const forms = document.querySelectorAll("form[data-validate-required]");
  forms.forEach((form) => {
    const inputs = form.querySelectorAll("[required]");

    // Add a 'change' event listener to each input field to validate the field whenever it changes.
    inputs.forEach((input) => {
      input.addEventListener("change", () => _validateRequired(input.id));
    });

    // Listen for the form's submit event and validate the form when it's submitted.
    const ids = Array.from(inputs).map((input) => input.id);
    form.addEventListener("submit", (event) => _validateForm(event, ids));
  });

  /**
   * Validates the form by looping over an array of field IDs and validating each field.
   * If any field fails validation, it prevents the default event behavior and focuses on the first input with an error.
   *
   * @param {Event} event - The event object triggered by the form submission.
   * @param {Array} ids - An array of field IDs to be validated.
   */
  function _validateForm(event, ids) {
    let validationResults = [];
    // loop over array of ids
    ids.forEach((id) => {
      validationResults.push(_validateRequired(id));
    });

    // focus on the first input with an error (the field corresponding to the index of the first 'false' value in validationResults)
    if (validationResults.includes(false)) {
      if (event) {
        event.preventDefault();
      }
      const firstErrorIndex = validationResults.indexOf(false);
      document.getElementById(ids[firstErrorIndex]).focus();
    }
  }

  /**
   * Validates a field based on its ID.
   *
   * @param {string} id - The ID of the field to validate.
   * @returns {boolean} - Returns true if the field is valid, false otherwise.
   */
  function _validateRequired(id) {
    let error_html = (id, error) =>
      `<span id="${id}-error-message" data-testid="${id}-error" class="error-message" data-module="track-error" data-error-type="${error}" data-error-label="${id}">${error}</span>`;
    const field = document.getElementById(id);
    const value = field.value.trim();
    const group = field.closest(".form-group, .file-upload-group");
    const error_text = field.dataset.errorMsg;

    if (!value) {
      if (!group.classList.contains("form-group-error")) {
        // dont display the error more than once
        group.classList.add("form-group-error");
        field.insertAdjacentHTML("beforebegin", error_html(id, error_text));
      }
      return false;
    } else {
      if (group.classList.contains("form-group-error")) {
        group.classList.remove("form-group-error");
        document.getElementById(`${id}-error-message`).remove();
      }
      return true;
    }
  }
})();
