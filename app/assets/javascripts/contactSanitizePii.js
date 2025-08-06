/*
 * Sanitize PII in the user entered message of the contact form
 */
(function () {
  const contactForm = document.querySelector("form[action='/contact/message']");
  const contactMessage = contactForm
    ? contactForm.querySelector("textarea[name='message']")
    : null;

  if (contactForm && contactMessage) {
    // Listen for input changes and display a warning listing PII items found.
    contactMessage.addEventListener("input", function () {
      const sanitizedMessage = sanitizePii(contactMessage.value, {
        detectOnly: true,
      });
      const piiItems = JSON.parse(sanitizedMessage);
      if (piiItems.length) {
        // Add a list item for each PII item detected in #sanitize-pii empty UL
        const piiList = document.querySelector("#sanitize-pii ul");
        piiList.innerHTML = ""; // Clear previous items
        piiItems.forEach(function (item) {
          const listItem = document.createElement("li");
          listItem.textContent = `${window.polyglot.t(item.pattern)}: ${item.match}`;
          piiList.appendChild(listItem);
        });
        // Show the PII warning div
        document.querySelector("#sanitize-pii").style.display = "block";
      } else {
        // Hide the PII warning div if no PII items are detected
        document.querySelector("#sanitize-pii").style.display = "none";
      }
    });
    // Listen for form submission
    contactForm.addEventListener("submit", function () {
      try {
        contactMessage.value = sanitizePii(contactMessage.value);
      } catch (error) {
        console.error("Error sanitizing contact message:", error);
      }
    });
  }
})();
