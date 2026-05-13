/*
 * This module enhances the template content text area with a switch to enable right-to-left text direction.
 * It also shows/hides the one-click unsubscribe checkbox based on whether ((unsubscribe_url)) or ((unsub_link)) is in the content.
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

// Show/hide the one-click unsubscribe checkbox based on whether ((unsubscribe_url)) or ((unsub_link)) is in the content.
(function () {
  var setting = document.getElementById("custom-unsub-url-setting");
  if (!setting) return;
  var contentInput = document.getElementById("template_content");
  if (!contentInput) return;
  contentInput.addEventListener("change", function () {
    var val = contentInput.value;
    setting.classList.toggle(
      "hidden",
      !val.includes("((unsubscribe_url))") && !val.includes("((unsub_link))"),
    );
  });
})();
