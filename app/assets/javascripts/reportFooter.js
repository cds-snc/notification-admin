/**
 * This script handles the functionality of the "Generate Report" button on a webpage.
 * It provides immediate visual feedback when generating a report by:
 * 1. Showing a spinner immediately
 * 2. Updating the report count text immediately
 * 3. Disabling the button to prevent multiple clicks
 * 4. Sending a POST request to the server
 * 5. Refreshing the component based on the server response
 */
(function () {
  "use strict";

  // Helper function to update report status text
  function updateReportStatusText(container, generating, ready, deleted, currentLang) {
    // Get current language for proper text formatting
    currentLang = currentLang || document.documentElement.lang || 'en';
    
    const reportStatusText = container.querySelector("#report-status-text");
    if (!reportStatusText) return;
    
    const parts = [];
    
    if (generating > 0) {
      parts.push(`${generating} preparing`);
    }
    
    if (ready > 0) {
      if (ready > 1 && currentLang === 'fr') {
        parts.push(`${ready} prêts`);
      } else {
        parts.push(`${ready} ready`);
      }
    }
    
    if (deleted > 0) {
      if (deleted > 1 && currentLang === 'fr') {
        parts.push(`${deleted} supprimés`);
      } else {
        parts.push(`${deleted} deleted`);
      }
    }
    
    if (parts.length === 0) {
      reportStatusText.textContent = "";
      return;
    }
    
    // Format list with proper conjunctions
    let text = "";
    if (parts.length === 1) {
      text = parts[0];
    } else if (parts.length === 2) {
      text = parts.join(" and ");
    } else {
      const last = parts.pop();
      text = parts.join(", ") + ", and " + last;
    }
    
    reportStatusText.textContent = text;
  }

  // Main function to handle report generation
  document.addEventListener("DOMContentLoaded", function () {
    // We need to attach the handler like this because the button is continually re-written to the page using ajax requests
    document.body.addEventListener("click", function (event) {
      // Check if the clicked element matches the button's selector
      if (event.target.matches('button[name="generate-report"]')) {
        // Get the container and relevant elements
        const reportButton = event.target;
        const reportFooterContainer = reportButton.closest(".report-footer-container");
        const reportSpinner = document.getElementById("report-loader");
        const csrfTokenInput = document.querySelector('input[name="csrf_token"]');

        if (!reportFooterContainer || !reportSpinner || !csrfTokenInput) {
          console.error("Could not find required elements for report generation");
          return;
        }

        // Get current report counts from data attributes
        let generating = parseInt(reportFooterContainer.dataset.generating || "0", 10);
        const ready = parseInt(reportFooterContainer.dataset.ready || "0", 10);
        const deleted = parseInt(reportFooterContainer.dataset.deleted || "0", 10);
        
        // Immediately update UI to show processing state
        generating += 1; // Increment generating count
        reportFooterContainer.dataset.generating = generating;
        
        // Show spinner and disable button
        reportSpinner.classList.remove("hidden");
        reportButton.setAttribute("disabled", "disabled");
        reportButton.classList.add("disabled");
        
        // Update the status text immediately for better user feedback
        updateReportStatusText(reportFooterContainer, generating, ready, deleted);

        // Create FormData for the request
        const formData = new FormData();
        formData.append("csrf_token", csrfTokenInput.value);
        formData.append("generate-report", "true");

        // Send POST request
        fetch(window.location.href, {
          method: "POST",
          headers: {
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          body: formData,
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((data) => {
            // The AJAX response will refresh the component,
            // but we'll leave our visual indicators in place until then
            console.log("Report generation initiated successfully");
          })
          .catch((error) => {
            console.error("Error preparing report:", error);
            
            // If there's an error, revert the UI changes
            generating -= 1;
            reportFooterContainer.dataset.generating = generating;
            
            if (generating <= 0) {
              reportSpinner.classList.add("hidden");
              reportButton.removeAttribute("disabled");
              reportButton.classList.remove("disabled");
            }
            
            updateReportStatusText(reportFooterContainer, generating, ready, deleted);
          });
      }
    });
  });
})();
