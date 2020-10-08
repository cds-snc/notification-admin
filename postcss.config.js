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
  ],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
});

module.exports = {
  plugins: [
    require("tailwindcss"),
    cssnano({
      preset: "default"
    }),
    require("autoprefixer"),
    purgecss
  ]
};
