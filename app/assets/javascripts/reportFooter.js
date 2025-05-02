/**
 * This script handles the functionality of a "Generate Report" button on a webpage.
 * It ensures that when the button is clicked, a spinner is displayed, the button is disabled,
 * and a POST request is sent to the server with the necessary CSRF token and form data.
 *
 * Notes:
 * - The button is dynamically rewritten using AJAX, so the event listener is attached
 *   to the body to handle future instances of the button.
 * - The script listens for the DOMContentLoaded event to ensure the DOM is fully loaded
 *   before attaching an event listener to the body. This allows it to handle dynamically
 *   added buttons via AJAX.
 *
 */
(function () {
  "use strict";
  // ensure dom is loaded
  document.addEventListener("DOMContentLoaded", function () {
    // We need to attach the handler like this because the button is continually re-written to the page using ajax requests
    document.body.addEventListener("click", function (event) {
      // Check if the clicked element matches the button's selector
      if (event.target.matches('button[name="generate-report"]')) {
        // get the pieces of the DOM we need to work with
        const reportButton = event.target;
        const reportSpinner = document.getElementsByClassName("report-loader")[0];
        const csrfTokenInput = document.querySelector(
          'input[name="csrf_token"]',
        );

        if (reportSpinner) {
          console.log("Report button clicked");
          // Show the spinner and disable the button
          reportSpinner.classList.remove("hidden");
          reportButton.setAttribute("disabled", "disabled");
          reportButton.classList.add("disabled");

          // Create FormData to send the token
          const formData = new FormData();
          formData.append("csrf_token", csrfTokenInput.value);
          formData.append("generate-report", "true"); // Example if the server needs the button name

          fetch(window.location.href, {
            method: "POST",
            headers: {
              "X-Requested-With": "XMLHttpRequest",
            },
            credentials: "same-origin", // Include cookies for session authentication
            body: formData,
          })
            .then((response) => {
              if (!response.ok) {
                throw new Error("Network response was not ok");
              }
            })
            .catch((error) => {
              console.error("Error preparing report:", error);
            });
        } else {
          console.error("Could not find report-loader element");
        }
      }
    });
  });
})();
