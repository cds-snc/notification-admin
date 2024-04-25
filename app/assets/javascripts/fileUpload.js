(function (Modules) {
  "use strict";

  Modules.FileUpload = function () {
    this.submit = () => this.$form.trigger("submit");

    this.cancelText = window.polyglot.t("cancel_upload");

    this.showCancelButton = () => {
      $("#file-upload-button", this.$form)
        .addClass("button-red")
        .text(this.cancelText)
        .attr("id", "#file-upload-button");
    };

    this.showFileName = () => {
      let fileInput = document.querySelector("input#file_upload");
      $("#file-description", this.$form).text(
        `${window.polyglot.t("File name:")} ${fileInput.files[0].name}`
      );
    };

    this.start = function (component) {
      this.$form = $(component);

      // Clear the form if the user navigates back to the page
      $(window).on("pageshow", () => this.$form[0].reset());

      // Handle the clicking of the button. Clicking the button triggers a click on the label.
      this.$form.on("click", "#file-upload-button", () =>
        $(".file-upload-field", this.$form).trigger("click")
      );

      // Need to put the event on the container, not the input for it to work properly
      this.$form.on("change", ".file-upload-field", () => {
        this.showCancelButton();
        this.showFileName();
      });
    };
  };
})(window.GOVUK.Modules);
