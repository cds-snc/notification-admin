const cssnano = require("cssnano");

console.log("=== POST CSS  ===");

const purgecss = require("@fullhuman/postcss-purgecss")({
  content: ["./app/**/*.html", "./app/assets/javascripts/*.js"],
  safelist: [
    "line-under",
    "flip",
    "phone",
    "bottom-2",
    "bg-red",
    "list-entry-remove",
    "shim",
    "content-fixed",
    "text-gray-grey1",
    "border-gray-grey2",
    "pl-doubleGutter",
    "px-doubleGutter",
    "pt-gutterHalf",
    "mb-12",
    "clear-both",
    "w-auto",
    "text-right",
    "template-list-selected-counter",
    "w-2/3",
    "mb-8",
    "focus:outline-none",
    "w-3/6",
    "pr-gutter",
    "mt-0",
    "lg:order-none",
    "order-last",
    "max-w-xl",
  ],
  defaultExtractor: (content) => content.match(/[\w-/:]+(?<!:)/g) || [],
});

module.exports = {
  plugins: [
    require("postcss-import"),
    require("tailwindcss"),
    cssnano({
      preset: "default",
    }),
    require("autoprefixer"),
    purgecss,
  ],
};
