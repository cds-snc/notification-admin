(function (Modules) {
  "use strict";

  if (!("oninput" in document.createElement("input"))) return;

  const tagPattern = /\(\(([^\)\((\?)]+)(\?\?)?([^\)\(]*)\)\)/g;
  // set text_direction variable based on value of checkbox #text_direction_rtl
  const textDirectionElement = document.getElementById("text_direction_rtl");
  const textDirection = textDirectionElement && textDirectionElement.checked
    ? "rtl"
    : "ltr";

  Modules.HighlightTags = function () {
    this.start = function (textarea) {
      this.$textbox = $(textarea)
        .wrap(
          `
          <div class='textbox-highlight-wrapper' dir='${textDirection}' />
        `,
        )
        .after(
          (this.$background = $(`
          <div class="textbox-highlight-background" aria-hidden="true" />
        `)),
        )
        .on("input", this.update);

      this.initialHeight = this.$textbox.height();

      this.$background.css({
        width: this.$textbox.outerWidth(),
        "border-width": this.$textbox.css("border-width"),
      });

      this.$textbox.trigger("input");
    };

    this.resize = () => {
      this.$textbox.height(
        Math.max(this.initialHeight, this.$background.outerHeight()),
      );

      if ("stickAtBottomWhenScrolling" in GOVUK) {
        GOVUK.stickAtBottomWhenScrolling.recalculate();
      }
    };

    this.escapedMessage = () => $("<div/>").text(this.$textbox.val()).html();

    this.replacePlaceholders = () =>
      this.$background.html(
        this.escapedMessage().replace(
          tagPattern,
          (match, name, separator, value) =>
            value && separator
              ? `<span class='placeholder-conditional'>((${name}??</span>${value}))`
              : `<span class='placeholder'>((${name}${value}))</span>`,
        ),
      );

    this.update = () => this.replacePlaceholders() && this.resize();
  };
})(window.GOVUK.Modules);
