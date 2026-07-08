/*
 * This module enhances the template content text area with a switch to enable right-to-left text direction.
 * It also shows/hides the one-click unsubscribe checkbox based on whether ((unsubscribe_url)) or ((unsub_link)) is in the content,
 * and updates the checkbox label to match the variable name used.
 */
(function () {
  const checkbox = document.getElementById("text_direction_rtl");
  const content = document.getElementById("template_content");

  // update the dir attribute when checkbox is clicked
  if (checkbox) {
    checkbox.addEventListener("change", function () {
      content.dir = this.checked ? "rtl" : "ltr";
      content.closest(".textbox-highlight-wrapper").dir = content.dir;
    });

    // on page load, if the checkbox is checked, set the dir attribute
    if (checkbox.checked) {
      content.dir = "rtl";
    }
  }
})();

// Show/hide and update label for the one-click unsubscribe checkbox based on which variable is in the content.
(function () {
  var setting = document.getElementById("custom-unsub-url-setting");
  if (!setting) return;
  var contentInput = document.getElementById("template_content");
  if (!contentInput) return;
  var label = setting.querySelector(".multiple-choice__label");
  contentInput.addEventListener("change", function () {
    var val = contentInput.value;
    var hasUnsubUrl = val.includes("((unsubscribe_url))");
    var hasUnsubLink = val.includes("((unsub_link))");
    setting.classList.toggle("hidden", !hasUnsubUrl && !hasUnsubLink);
    if (label) {
      if (hasUnsubLink && !hasUnsubUrl) {
        label.textContent = label.dataset.labelUnsubLink;
      } else {
        label.textContent = label.dataset.labelUnsubscribeUrl;
      }
    }
  });
})();
