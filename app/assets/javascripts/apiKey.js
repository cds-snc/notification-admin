(function (Modules) {
  "use strict";

  if (!document.queryCommandSupported("copy")) return;

  Modules.ApiKey = function () {
    const states = {
      keyVisible: (key, thing) => `
        <span class="api-key-key">${key}</span>
        <button type='button' class='js-api-key-button-copy absolute bottom-2 active:top-auto button button-secondary'>${window.polyglot.t(
          "copy",
        )} ${thing} ${window.polyglot.t("to_clipboard")}</button>
      `,
      keyCopied: (thing) => `
        <span class="api-key-key">${window.polyglot.t(
          "copied_to_clipboard",
        )}</span>
        <button type='button' class='js-api-key-button-show absolute bottom-2 active:top-auto button button-secondary'>${window.polyglot.t(
          "show",
        )} ${thing}</button>
      `,
    };

    this.copyKey = function (keyElement, callback) {
      var selection = window.getSelection
          ? window.getSelection()
          : document.selection,
        range = document.createRange();
      selection.removeAllRanges();
      range.selectNodeContents(keyElement);
      selection.addRange(range);
      document.execCommand("copy");
      selection.removeAllRanges();
      callback();
    };

    this.start = function (component) {
      const $component = $(component),
        key = $component.data("key"),
        thing = $component.data("thing");

      $component
        .addClass("api-key")
        .css("min-height", $component.height())
        .html(states.keyVisible(key, thing))
        .attr("aria-live", "polite")
        .on("click", ".js-api-key-button-copy", () =>
          this.copyKey($(".api-key-key", component)[0], () =>
            $component.html(states.keyCopied(thing)),
          ),
        )
        .on("click", ".js-api-key-button-show", () =>
          $component.html(states.keyVisible(key, thing)),
        );

      if ("stickAtBottomWhenScrolling" in GOVUK) {
        GOVUK.stickAtBottomWhenScrolling.recalculate();
      }
    };
  };
})(window.GOVUK.Modules);
