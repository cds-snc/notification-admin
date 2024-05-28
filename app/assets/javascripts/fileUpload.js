(function (Modules) {
  "use strict";

  Modules.FileUpload = function () {
    this.submit = () => this.$form.trigger("submit");

    this.cancelText = window.polyglot.t("cancel_upload");

    this.showCancelButton = () =>
      $("#file-upload-button", this.$form).replaceWith(`
      <a href="" class='button button-red font-normal'>${this.cancelText}</a>
    `);

    this.start = function (component) {
      this.$form = $(component);

      // Clear the form if the user navigates back to the page
      $(window).on("pageshow", () => this.$form[0].reset());

      // Need to put the event on the container, not the input for it to work properly
      this.$form.on(
        "change",
        ".file-upload-field",
        () => this.submit() && this.showCancelButton(),
      );
    };
  };
})(window.GOVUK.Modules);
