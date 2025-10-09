(function (Modules) {
  var previewVisible = false;
  const emailSafe = window.utils.emailSafe;

  Modules.UrlTyper = $("input#email_from").on("keyup", function () {
    var inputValue = $(this).val();
    inputValue = emailSafe(inputValue);

    // if there is an input value at all
    if (inputValue.length) {
      // Update the text first
      $("#fixed-email-address").text(inputValue);

      if (!previewVisible) {
        // show the "Your preview email" string
        $("#preview").show();
        previewVisible = true;
      }
    } else {
      if (previewVisible) {
        // hide the preview text
        $("#preview").hide();
        previewVisible = false;
      }
    }
  });
})(window.GOVUK.Modules);
