(function (Modules) {
  var previewVisible = false;

  function emailSafe(string, whitespace = ".") {
    // this is the javascript equivalent of the python function app/utils.py:email_safe

    // Strip accents, diacritics etc
    string = string.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      
    // Replace spaces with the whitespace character (default ".")
    string = string.trim().replace(/\s+/g, whitespace);

    // Keep only alphanumeric, whitespace character, hyphen and underscore
    string = string.split('').map(char => {
      return /[a-zA-Z0-9]/.test(char) || [whitespace, "-", "_"].includes(char) ? 
            char.toLowerCase() : "";
    }).join('');

    // Replace multiple consecutive dots with a single dot
    string = string.replace(/\.{2,}/g, ".");

    // Replace sequences like ".-." or "._." with just "-" or "_"
    string = string.replace(/(\.)([-_])(\.)/g, "$2");

    // Disallow repeating ., -, or _
    string = string.replace(/(\.|-|_){2,}/g, "$1");

    // Remove dots at beginning and end
    return string.replace(/^\.|\.$/g, "");
  }

  Modules.UrlTyper = $("input#email_from").on("keyup", function () {
    var inputValue = $(this).val()
    inputValue = emailSafe(inputValue);

    // if there is an input value at all
    if (inputValue.length) {
      if (!previewVisible) {
        // show the "Your preview email" string
        $("#preview").show();
        previewVisible = true;
      }
      $("#fixed-email-address").text(inputValue);
    } else {
      if (previewVisible) {
        // hide the preview text
        $("#preview").hide();
        previewVisible = false;
      }
    }
  });
})(window.GOVUK.Modules);
