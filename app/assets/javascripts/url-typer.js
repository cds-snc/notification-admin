(function (Modules) {
  var previewVisible = false;
  const emailSafe = window.utils.emailSafe;
  let debounceTimer;

  Modules.UrlTyper = $("input#email_from").on("keyup", function () {
    var inputValue = $(this).val();
    inputValue = emailSafe(inputValue);

    // if there is an input value at all
    if (inputValue.length) {
      if (!previewVisible) {
        // show the "Your preview email" string
        $("#preview").show();
        previewVisible = true;
      }
      
      // Update visual display immediately (without aria-live)
      $("#fixed-email-address").text(inputValue);
      
      // Find the aria-live region and temporarily disable it
      var liveRegion = $("#fixed-email-address").closest('[aria-live]');
      if (liveRegion.length) {
        liveRegion.attr('aria-live', 'off');
      }
      
      // Debounce the aria-live announcement - only announce after user stops typing
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(function() {
        // Re-enable aria-live so it announces the final value
        if (liveRegion.length) {
          liveRegion.attr('aria-live', 'polite');
        }
      }, 1000);
    } else {
      if (previewVisible) {
        // hide the preview text
        $("#preview").hide();
        previewVisible = false;
      }
    }
  });
})(window.GOVUK.Modules);
