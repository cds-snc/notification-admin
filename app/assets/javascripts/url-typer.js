(function (Modules) {
  var previewVisible = false;

  Modules.UrlTyper = $("input#email_from").on("keyup", function () {
    var inputValue = $(this)
      .val()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // replace accented letters with latin characters
      .replace(/ +/g, ".") // replace whitespace with hyphens
      .replace(/[^a-z0-9-\.]/g, "") // replace anything that's not a letter, number, or a hyphen
      .replace(/\.{2,}/g, ".") // if there are multiple .. , replace it with a single .
      .replace(/(\.)(-|_)(\.)/g, "-") // Replace a sequence like ".-." or "._." to "-""
      .replace(/(\.|-|_){2,}/g, ""); // Disallow to repeat - _ or .

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
