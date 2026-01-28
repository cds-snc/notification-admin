/*
 * Sanitize PII in the user entered message of the contact form
 */
(function () {
  // Update selector to match both English and French contact form actions
  const contactForm = document.querySelector(
    "form[action$='/contact/message']",
  );
  const contactMessage = contactForm
    ? contactForm.querySelector("textarea[name='message']")
    : null;

  if (contactForm && contactMessage) {
    // Track whether the warning has been shown (to avoid double counting)
    let warningShownOnce = false;

    // Listen for input changes and display a warning listing PII items found.
    contactMessage.addEventListener("input", function () {
      const sanitizedMessage = sanitizePii(contactMessage.value, {
        detectOnly: true,
      });
      const piiItems = JSON.parse(sanitizedMessage);
      if (piiItems.length) {
        // Add a list item for each PII item detected in #sanitize-pii empty UL
        const piiList = $("#sanitize-pii ul");
        piiList.empty(); // Clear previous items
        piiItems.forEach(function (item) {
          const listItem = $("<li></li>").text(
            `${window.polyglot.t(item.pattern)}: ${item.match}`,
          );
          piiList.append(listItem);
        });
        // Show the PII warning div
        $("#sanitize-pii").show();

        // Track GA event when warning is shown for the first time
        if (!warningShownOnce && typeof gtag !== "undefined") {
          warningShownOnce = true;
          const language = document.documentElement.lang || "en";
          gtag("event", "pii_warning_displayed", {
            event_category: "Contact Form",
            event_label: "PII warning shown to user",
            language: language,
          });
        }
      } else {
        // Hide the PII warning div if no PII items are detected
        $("#sanitize-pii").hide();
      }
    });
    // Listen for form submission
    contactForm.addEventListener("submit", function () {
      try {
        const originalMessage = contactMessage.value;
        contactMessage.value = sanitizePii(contactMessage.value);
        
        // Track GA event if PII was actually removed on submission
        if (originalMessage !== contactMessage.value && typeof gtag !== "undefined") {
          const language = document.documentElement.lang || "en";
          gtag("event", "pii_removed_on_submit", {
            event_category: "Contact Form",
            event_label: "PII removed when form submitted",
            language: language,
          });
        }
      } catch (error) {
        console.error("Error sanitizing contact message:", error);
      }
    });
  }
})();
