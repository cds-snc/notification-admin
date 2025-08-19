(function (Modules) {
  "use strict";

  Modules.TemplateFolderForm = function () {
    this.start = function (templateFolderForm) {
      this.$form = $(templateFolderForm);

      // remove the hidden unknown button - if you've got JS enabled then the action you want to do is implied by
      // which field is visible.
      this.$form.find("button[value=unknown]").remove();

      this.$liveRegionCounter = this.$form.find(".selection-counter");
      this.$legend = this.$form.find("#aria-live-legend");
      this.$buttonContainer = this.$form.find(".aria-live-region");
      this.$nothingSelectedButtons = this.buildEmptyStateButtons();
      this.$buttonContainer.before(this.itemsSelectedButtons);

      // all the diff states that we want to show or hide
      this.states = [
        {
          key: "nothing-selected-buttons",
          $el: this.$nothingSelectedButtons,
          cancellable: false,
        },
        {
          key: "items-selected-buttons",
          $el: this.$form.find("#items_selected"),
          cancellable: false,
        },
        {
          key: "move-to-existing-folder",
          $el: this.$form.find("#move_to_folder_radios"),
          cancellable: true,
          setFocus: this.getFocusRoutine("#move_to_folder_radios legend", true),
        },
        {
          key: "move-to-new-folder",
          $el: this.$form.find("#move_to_new_folder_form"),
          cancellable: true,
          setFocus: this.getFocusRoutine("#move_to_new_folder_name", false),
        },
        {
          key: "add-new-folder",
          $el: this.$form.find("#add_new_folder_form"),
          cancellable: true,
          setFocus: this.getFocusRoutine("#add_new_folder_name", false),
        },
        {
          key: "add-new-template",
          $el: this.$form.find("#add_new_template_form"),
          cancellable: true,
          setFocus: this.getFocusRoutine("#add_new_template_form", true),
        },
      ];

      // cancel/clear buttons only relevant if JS enabled, so
      this.states
        .filter((state) => state.cancellable)
        .forEach((x) => this.addCancelButton(x));
      this.states
        .filter((state) => state.key === "items-selected-buttons")
        .forEach((x) => this.addClearButton(x));

      // activate stickiness of elements in each state
      this.activateStickyElements();

      // first off show the new template / new folder buttons
      this._lastState = this.$form.data("prev-state");
      if (this._lastState === undefined) {
        this.selectActionButtons();
      } else {
        this.currentState = this._lastState;
        this.render();
      }

      this.$form.on("click", "js-button-action", (event) =>
        this.actionButtonClicked(event),
      );
      this.$form.on("click", "button[value=add-new-template]", (event) => {
        event.stopPropagation();
        event.preventDefault();
        window.location.href = `${window.location.href}/create`;
      });
      this.$form.on("change", "input[type=checkbox]", () =>
        this.templateFolderCheckboxChanged(),
      );

      this.$form.on("click", ".copy-template", (event) => {
        event.stopPropagation();
        event.preventDefault();
        window.location = window.location + "/copy";
      });
    };

    this.getFocusRoutine = function (selector, setTabindex) {
      return function () {
        let $el = $(selector);
        let removeTabindex = (e) => {
          $(e.target).removeAttr("tabindex").off("blur", removeTabindex);
        };

        if (setTabindex) {
          $el.attr("tabindex", "-1");
          $el.on("blur", removeTabindex);
        }

        $el.trigger("focus");
      };
    };

    this.activateStickyElements = function () {
      var oldClass = "js-will-stick-at-bottom-when-scrolling";
      var newClass = "do-js-stick-at-bottom-when-scrolling";

      // remove the sticky footer -> if ...
      // no templates / folders items exist for the user
      // see: https://github.com/cds-snc/notification-api/issues/152
      if ($(".template-list-item").length === 0) {
        $(".js-stick-at-bottom-when-scrolling").removeClass(
          "js-stick-at-bottom-when-scrolling",
        );
      }

      this.states.forEach((state) => {
        state.$el
          .find("." + oldClass)
          .removeClass(oldClass)
          .addClass(newClass);
      });
    };

    this.addCancelButton = function (state) {
      let selector = `[value=${state.key}]`;
      let $cancel = this.makeButton(window.polyglot.t("cancel_button"), {
        onclick: () => {
          // clear existing data
          state.$el.find("input:radio").prop("checked", false);
          state.$el.find("input:text").val("");

          // go back to action buttons
          this.selectActionButtons(selector);
        },
        cancelSelector: selector,
        nonvisualText: "this step",
      });

      state.$el.find("[type=submit]").after($cancel);
    };

    this.addClearButton = function (state) {
      let selector = "button[value=add-new-template]";
      let $clear = this.makeButton(window.polyglot.t("clear_button"), {
        onclick: () => {
          // uncheck all templates and folders
          this.$form.find("input:checkbox").prop("checked", false);

          // go back to action buttons
          this.selectActionButtons(selector);
        },
        nonvisualText: "selection",
      });

      state.$el.find(".template-list-selected-counter").append($clear);
    };

    this.makeButton = (text, opts) => {
      let $btn = $('<a href=""></a>')
        .html(text)
        .addClass("js-cancel")
        // isn't set if cancelSelector is undefined
        .data("target", opts.cancelSelector || undefined)
        .attr("tabindex", "0")
        .on("click keydown", (event) => {
          // space, enter or no keyCode (must be mouse input)
          if ([13, 32, undefined].indexOf(event.keyCode) > -1) {
            event.preventDefault();
            if (opts.hasOwnProperty("onclick")) {
              opts.onclick();
            }
          }
        });

      if (opts.hasOwnProperty("nonvisualText")) {
        $btn.append(
          `<span class="visuallyhidden"> ${opts.nonvisualText}</span>`,
        );
      }

      return $btn;
    };

    this.selectActionButtons = function (targetSelector) {
      // If we want to show one of the grey choose actions state, we can pretend we're in the choose actions state,
      // and then pretend a checkbox was clicked to work out whether to show zero or non-zero options.
      // This calls a render at the end
      this.currentState = "nothing-selected-buttons";
      this.templateFolderCheckboxChanged();
      if (targetSelector) {
        let setFocus = this.getFocusRoutine(targetSelector, false);
        setFocus();
      }
    };

    // method that checks the state against the last one, used prior to render() to see if needed
    this.stateChanged = function () {
      let changed = this.currentState !== this._lastState;

      this._lastState = this.currentState;
      return changed;
    };

    this.actionButtonClicked = function (event) {
      event.preventDefault();
      this.currentState =
        $(event.currentTarget).val() || $(event.currentTarget).attr("value");

      if (this.stateChanged()) {
        this.render();
      }
    };

    this.selectionStatus = {
      default: window.polyglot.t("nothing_selected"),
      selected: (numSelected) => {
        if (numSelected === 1) {
          return `${numSelected} ` + window.polyglot.t("selection");
        }
        return `${numSelected} ` + window.polyglot.t("selections");
      },
      update: (numSelected) => {
        let message =
          numSelected > 0
            ? this.selectionStatus.selected(numSelected)
            : this.selectionStatus.default;

        $(".template-list-selected-counter__count").html(message);
        this.$liveRegionCounter.html(message);
      },
    };

    this.legendText = {
      default: window.polyglot.t("create_template_legend"),
      selected: (numSelected) => {
        if (numSelected === 1) {
          return window.polyglot.t("selecting_templates_legend");
        }
        return window.polyglot.t("move_template_legend");
      },
      update: (numSelected) => {
        let message =
          numSelected > 0
            ? this.legendText.selected(numSelected)
            : this.legendText.default;

        this.$legend.html(message);
      },
    };

    this.templateFolderCheckboxChanged = function () {
      let numSelected = this.countSelectedCheckboxes();

      if (
        this.currentState === "nothing-selected-buttons" &&
        numSelected !== 0
      ) {
        // user has just selected first item
        this.currentState = "items-selected-buttons";
      } else if (
        this.currentState === "items-selected-buttons" &&
        numSelected === 0
      ) {
        // user has just deselected last item
        this.currentState = "nothing-selected-buttons";
      }

      if (this.stateChanged()) {
        this.render();
      }

      this.legendText.update(numSelected);
      this.selectionStatus.update(numSelected);

      $(".template-list-selected-counter").toggle(this.hasCheckboxes());
    };

    this.hasCheckboxes = function () {
      return !!this.$form.find("input:checkbox").length;
    };

    this.hasTemplates = function () {
      return !!this.$form.find(".template-list-item").length;
    };

    this.countSelectedCheckboxes = function () {
      return this.$form.find("input:checkbox:checked").length;
    };

    this.render = function () {
      let mode = "default";
      let currentStateObj = this.states.filter((state) => {
        return state.key === this.currentState;
      })[0];

      // detach everything, unless they are the currentState
      this.states.forEach((state) =>
        state.key === this.currentState && state.key !== "add-new-template"
          ? this.$buttonContainer.before(state.$el)
          : state.$el.detach(),
      );

      // ???
      if (this.currentState === "add-new-template") {
        // nav to create page.
        window.location.href = `${window.location.href}/create`;
      }

      // Generic most common case: Empty state + non-empty but no items selected
      if (this.currentState == "nothing-selected-buttons") {
        var $menuButton = $(this.$nothingSelectedButtons).find(
          'button[data-module="menu"]',
        );
        var stickyContainer = $menuButton.parents().find("div[class*=js-stick-at-bottom-when-scrolling]");
        if ($menuButton.length) {
          var addNewTemplateMenuModule = new window.GOVUK.Modules.Menu();
          this.states.find((s) => s.key === "nothing-selected-buttons").$el =
            this.$nothingSelectedButtons;
          addNewTemplateMenuModule.start($menuButton[0]);
        }
      }

      if (this.currentState === "items-selected-buttons") {
        this.$buttonContainer.before(this.itemsSelectedButtons);
        this.$form.find("#items_selected").show();
        this.$form.find("#nothing_selected").hide();
      }

      // if (this.currentState !== "add-new-folder") {
      //   this.$form.find("#nothing_selected").remove();
      //   this.$nothingSelectedButtons = this.buildEmptyStateButtons();
      //   // Also update the state object:
      //   this.states.find((s) => s.key === "nothing-selected-buttons").$el =
      //     this.$nothingSelectedButtons;
      //   this.$buttonContainer.before(this.$nothingSelectedButtons);
      //   // Since we're inserting a disclosure menu dynamically after the DOM is ready
      //   // Then we need to call the Menu module to register the menu manually
      //   var $menuButton = $(this.$nothingSelectedButtons).find(
      //     'button[data-module="menu"]',
      //   );
      //   if ($menuButton.length) {
      //     var addNewTemplateMenuModule = new window.GOVUK.Modules.Menu();
      //     addNewTemplateMenuModule.start($menuButton[0]);
      //   }
      // }

      // use dialog mode for states which contain more than one form control
      if (this.currentState === "move-to-existing-folder") {
        mode = "dialog";
      }
      GOVUK.stickAtBottomWhenScrolling.setMode(mode);
      // make sticky JS recalculate its cache of the element's position
      GOVUK.stickAtBottomWhenScrolling.recalculate();

      if (currentStateObj && "setFocus" in currentStateObj) {
        currentStateObj.setFocus();
      }
    };

    this.getSampleLibraryButtonText = function () {
      if (
        this.currentState === "nothing-selected-buttons" &&
        !this.hasTemplates()
      ) {
        return window.polyglot.t("explore_sample_library_button");
      } else {
        return window.polyglot.t("sample_library_button");
      }
    };

    this.buildEmptyStateButtons = function () {
      let copyButton = "";
      if (this.hasTemplates()) {
        copyButton = `<button class="button js-button-action button-secondary copy-template" type="button" id="copy-template" value="copy-template">${window.polyglot.t("copy_template_button")}</button>`;
      }
      let emptyStateBtns = $(`
        <div id="nothing_selected">
          <div class="js-stick-at-bottom-when-scrolling">
            <button class="button" type="submit" value="add-new-template">${window.polyglot.t(
        "new_template_button",
      )}</button>
            <button class="button js-button-action button-secondary copy-template" type="button" value="copy-template">${window.polyglot.t(
        "copy_template_button",
      )}</button>
            <button class="button js-button-action button-secondary" type="button" value="add-new-folder">${window.polyglot.t(
        "new_folder_button",
      )}</button>
            ${window.APP_COMPONENTS.sample_template_button}
            <div class="template-list-selected-counter">
              <span class="template-list-selected-counter__count" aria-hidden="true">
                ${this.selectionStatus.default}
              </span>
            </div>
          </div>
        </div>
      `);
      emptyStateBtns.find("div.indicator-relative > button:first-child").text(`${window.APP_PHRASES.sample_library_button}`)
      return emptyStateBtns;
    };

    this.itemsSelectedButtons = $(`
      <div id="items_selected">
        <div class="js-stick-at-bottom-when-scrolling">
          <button class="button js-button-action button-secondary" value="move-to-existing-folder">${window.polyglot.t("move")}</button>
          <button class="button js-button-action button-secondary" value="move-to-new-folder">${window.polyglot.t("add_to_new_folder")}</button>
          <div class="template-list-selected-counter" aria-hidden="true">
            <span class="template-list-selected-counter__count" aria-hidden="true">
              ${this.selectionStatus.selected(1)}
            </span>
          </div>
        </div>
      </div>
    `).get(0);
  };
})(window.GOVUK.Modules);
