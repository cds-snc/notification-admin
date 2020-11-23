const cssnano = require("cssnano");

console.log("=== POST CSS  ===");

const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./app/**/*.html"],
  safelist: [
    "line-under",
    "flip",
    "phone",
    "error-message",
    "form-group-error",
    "form-control-error",
    "banner",
    "banner-dangerous",
    "banner-with-tick",
    "banner-list-bullet",
    "bottom-2",
    "bg-red",
    "list-entry-remove",
    "shim",
    "content-fixed",
    "text-gray-grey1",
    "sms-message-wrapper",
    "sms-message-sender",
    "border-gray-grey2",
    "pl-doubleGutter",
    "px-doubleGutter",
    "pt-gutterHalf",
    "email-message-body",
    "email-message-table",
    "email-message-meta",
    "mb-12",
    "selection-summary__text--folders",
    "radios-nested",
    "checkboxes-nested",
    "clear-both",
    "w-auto",
    "textbox-highlight-textbox",
    "textbox-highlight-background",
    "textbox-highlight-wrapper",
    "text-right",
  ],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
});

module.exports = {
  plugins: [
    require('postcss-import'),
    require("tailwindcss"),
    cssnano({
      preset: "default"
    }),
    require("autoprefixer"),
    purgecss
  ]
};
