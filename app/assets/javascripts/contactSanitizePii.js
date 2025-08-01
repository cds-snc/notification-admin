/*
 * Sanitize PII in the user entered message of the contact form
 */
(function () {
  const contactForm = document.querySelector("form[action='/contact/message']");
  const contactMessage = contactForm
    ? contactForm.querySelector("textarea[name='message']")
    : null;

  if (contactForm && contactMessage) {
    contactForm.addEventListener("submit", function () {
      try {
        contactMessage.value = sanitizePii(contactMessage.value);
      } catch (error) {
        console.error("Error sanitizing contact message:", error);
      }
    });
  }
})();
