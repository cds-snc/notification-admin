(function (global) {
  "use strict";

  const GOVUK = global.GOVUK;

  function Summary(module) {
    this.module = module;
    this.$el = module.$formGroup.find("fieldset .selection-summary");
    this.fieldLabel = module.fieldLabel;

    this.translate = false;

    if (typeof window.polyglot.t !== "undefined") {
      this.translate = window.polyglot.t;
    } else {
      console.warn("polyglot not found");
    }

    this.total = module.total;
    this.addContent();
    this.update(module.getSelection());
  }
  Summary.prototype.templates = {
    all: (selection, total, field) => {
      return window.polyglot.t(`all_${field}s`);
    },
    some: (selection, total, field) =>
      window.polyglot.t(`selection_of_total_${field}`, {
        selection: selection,
        total: total,
        smart_count: selection,
      }),
    none: (selection, total, field) =>
      ({
        folder: window.polyglot.t("no_folders_only_outside_folder"),
        "team member": window.polyglot.t("no_team_member_only_you"),
      }[field] ||
      window.polyglot.t("no_fields", {
        field: field,
      })),
  };
  Summary.prototype.addContent = function () {
    this.$text = $(`<p class="selection-summary__text" />`);

    if (this.fieldLabel === "folder") {
      this.$text.addClass("selection-summary__text--folders");
    }

    this.$el.append(this.$text);
  };
  Summary.prototype.update = function (selection) {
    let template;

    if (selection === this.total) {
      template = "all";
    } else if (selection > 0) {
      template = "some";
    } else {
      template = "none";
    }

    this.$text.html(
      this.templates[template](selection, this.total, this.fieldLabel)
    );
  };
  Summary.prototype.bindEvents = function () {
    // take summary out of tab order when focus moves
    this.$el.on("blur", (e) => $(this).attr("tabindex", "-1"));
  };

  function Footer(module) {
    this.module = module;
    this.fieldLabel = module.fieldLabel;
    this.fieldsetId = module.$fieldset.attr("id");
    this.$checkboxesDivId = module.$formGroup
      .find("fieldset .select-nested.checkboxes-nested")
      .attr("id");
    this.$el = this.getEl(this.module.expanded);
    this.module.$formGroup.append(this.$el);
  }
  Footer.prototype.buttonContent = {
    change: (fieldLabel) => {
      console.log("fieldLabel", fieldLabel);
      return window.polyglot.t(`choose_${fieldLabel}s`);
    },
    done: (fieldLabel) =>
      `${window.polyglot.t(
        "done"
      )}<span class='visuallyhidden'> ${window.polyglot.t(
        `choosing ${fieldLabel}s`
      )}</span>`,
  };
  Footer.prototype.getEl = function (expanded) {
    const buttonState = expanded ? "done" : "change";
    const buttonContent = this.buttonContent[buttonState](this.fieldLabel);
    const stickyClass = expanded ? " js-stick-at-bottom-when-scrolling" : "";

    console.log("expanded", expanded);
    return $(`<div class="clear-both selection-footer${stickyClass}">
              <button
                class="button button-secondary inline-block w-auto"
                aria-expanded="${expanded ? "true" : "false"}"
                aria-controls="${this.fieldsetId}">
              ${buttonContent}
              </button>
            </div>`);
  };
  Footer.prototype.update = function (expanded) {
    this.$el.remove();
    this.$el = this.getEl(expanded);

    this.module.$formGroup.append(this.$el);

    // make footer sticky if expanded, clear up from it being sticky if not
    GOVUK.stickAtBottomWhenScrolling.recalculate();
  };

  function CollapsibleCheckboxes() {}
  CollapsibleCheckboxes.prototype._focusTextElement = ($el) => {
    $el.attr("tabindex", "-1").focus();
  };
  CollapsibleCheckboxes.prototype.start = function (component) {
    this.$formGroup = $(component);
    this.$fieldset = this.$formGroup.find("fieldset");
    this.$checkboxesDiv = this.$fieldset.find(
      ".select-nested.checkboxes-nested, .multiple-choice"
    );
    this.$checkboxes = this.$fieldset.find("input[type=checkbox]");
    this.fieldLabel = this.$formGroup.data("fieldLabel");
    this.total = this.$checkboxes.length;
    this.legendText = this.$fieldset.find("legend").text().trim();
    this.expanded = false;

    // generate summary and footer
    this.footer = new Footer(this);
    this.summary = new Summary(this);

    this.$fieldset.find(".selection-summary").replaceWith(this.summary.$el);

    // add custom classes
    this.$formGroup.addClass("selection-wrapper");
    this.$fieldset.addClass("selection-content focus:outline-none");

    // hide checkboxes
    this.$checkboxesDiv.hide();

    this.bindEvents();
  };
  CollapsibleCheckboxes.prototype.getSelection = function () {
    return this.$checkboxes.filter(":checked").length;
  };
  CollapsibleCheckboxes.prototype.expand = function (e) {
    if (e !== undefined) {
      e.preventDefault();
    }

    if (!this.expanded) {
      this.$checkboxesDiv.show();
      this.expanded = true;
      this.summary.update(this.getSelection());
      this.footer.update(this.expanded);
    }

    // shift focus whether expanded or not
    this._focusTextElement(this.$fieldset);
  };
  CollapsibleCheckboxes.prototype.collapse = function (e) {
    if (e !== undefined) {
      e.preventDefault();
    }

    if (this.expanded) {
      this.$checkboxesDiv.hide();
      this.expanded = false;
      this.summary.update(this.getSelection());
      this.footer.update(this.expanded);
    }

    // shift focus whether expanded or not
    this._focusTextElement(this.summary.$text);
  };
  CollapsibleCheckboxes.prototype.handleClick = function (e) {
    if (this.expanded) {
      this.collapse(e);
    } else {
      this.expand(e);
    }
  };
  CollapsibleCheckboxes.prototype.handleSelection = function (e) {
    this.summary.update(this.getSelection(), this.total, this.fieldLabel);
  };
  CollapsibleCheckboxes.prototype.bindEvents = function () {
    const self = this;

    this.$formGroup.on("click", ".button", this.handleClick.bind(this));
    this.$checkboxes.on("click", this.handleSelection.bind(this));

    this.summary.bindEvents(this);
  };

  GOVUK.Modules.CollapsibleCheckboxes = CollapsibleCheckboxes;
})(window);
