// GULPFILE
// - - - - - - - - - - - - - - -
// This file processes all of the assets in the "src" folder
// and outputs the finished files in the "dist" folder.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -
const { src, pipe, dest, series, parallel, watch } = require("gulp");

const plugins = {};
plugins.addSrc = require("gulp-add-src");
plugins.babel = require("gulp-babel");
plugins.base64 = require("gulp-base64-inline");
plugins.concat = require("gulp-concat");
plugins.cssUrlAdjuster = require("gulp-css-url-adjuster");
plugins.jshint = require("gulp-jshint");
plugins.prettyerror = require("gulp-prettyerror");
plugins.uglify = require("gulp-uglify");

// 2. CONFIGURATION
// - - - - - - - - - - - - - - -
const paths = {
  src: "app/assets/",
  dist: "app/static/",
  templates: "app/templates/",
  npm: "node_modules/",
  toolkit: "node_modules/govuk_frontend_toolkit/"
};

// 3. TASKS
// - - - - - - - - - - - - - - -

// Move GOV.UK template resources

const javascripts = () => {
  return src([
    paths.toolkit + "javascripts/govuk/modules.js",
    paths.toolkit + "javascripts/govuk/show-hide-content.js",
    paths.src + "javascripts/utils.js",
    paths.src + "javascripts/webpackLoader.js",
    paths.src + "javascripts/stick-to-window-when-scrolling.js",
    paths.src + "javascripts/detailsPolyfill.js",
    paths.src + "javascripts/apiKey.js",
    paths.src + "javascripts/cbor.js",
    paths.src + "javascripts/fido2.js",
    paths.src + "javascripts/autofocus.js",
    paths.src + "javascripts/highlightTags.js",
    paths.src + "javascripts/fileUpload.js",
    paths.src + "javascripts/updateContent.js",
    paths.src + "javascripts/listEntry.js",
    paths.src + "javascripts/liveSearch.js",
    paths.src + "javascripts/preventDuplicateFormSubmissions.js",
    paths.src + "javascripts/fullscreenTable.js",
    paths.src + "javascripts/previewPane.js",
    paths.src + "javascripts/colourPreview.js",
    paths.src + "javascripts/templateFolderForm.js",
    paths.src + "javascripts/collapsibleCheckboxes.js",
    paths.src + "javascripts/moreMenu.js",
    paths.src + "javascripts/menu.js",
    paths.src + "javascripts/menuOverlay.js",
    paths.src + "javascripts/scopeTabNavigation.js",
    paths.src + "javascripts/main.js"
  ])
    .pipe(plugins.prettyerror())
    .pipe(
      plugins.babel({
        presets: ["@babel/preset-env"]
      })
    )
    .pipe(
      plugins.addSrc.prepend([
        //paths.src + 'javascripts/main.min.js',
        paths.npm + "hogan.js/dist/hogan-3.0.2.js",
        paths.npm + "jquery/dist/jquery.min.js",
        paths.npm + "jquery-migrate/dist/jquery-migrate.min.js",
        paths.npm + "query-command-supported/dist/queryCommandSupported.min.js",
        //paths.npm + "diff-dom/diffDOM.js",
        paths.npm + "textarea-caret/index.js"
      ])
    )
    .pipe(plugins.uglify())
    .pipe(plugins.concat("all.min.js"))
    .pipe(plugins.addSrc.prepend([
      paths.src + "javascripts/main.min.js",
      paths.src + "javascripts/scheduler.min.js",
    ]))
    .pipe(dest(paths.dist + "javascripts/"));
};

// copy static css
const static_css = () => {
  return src(paths.src + "/stylesheets/index.css").pipe(
    dest(paths.dist + "stylesheets/")
  );
};

// Copy images

const images = () => {
  return src([
    paths.toolkit + "images/**/*",
    paths.template + "assets/images/**/*",
    paths.src + "images/**/*"
  ]).pipe(dest(paths.dist + "images/"));
};

const watchFiles = {
  javascripts: cb => {
    watch([paths.src + "javascripts/**/*"], javascripts);
    cb();
  },
  images: cb => {
    watch([paths.src + "images/**/*"], images);
    cb();
  },
  self: cb => {
    watch(["gulpfile.js"], defaultTask);
    cb();
  }
};

// Default: compile everything
const defaultTask = parallel(
  series(
    images
  ),
  series(static_css),
  series(javascripts)
);

// Watch for changes and re-run tasks
const watchForChanges = parallel(
  watchFiles.javascripts,
  watchFiles.images,
  watchFiles.self
);

exports.default = defaultTask;

// Optional: recompile on changes
exports.watch = series(defaultTask, watchForChanges);
