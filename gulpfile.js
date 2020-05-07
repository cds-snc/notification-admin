// GULPFILE
// - - - - - - - - - - - - - - -
// This file processes all of the assets in the "src" folder
// and outputs the finished files in the "dist" folder.

// 1. LIBRARIES
// - - - - - - - - - - - - - - -
const { src, pipe, dest, series, parallel, watch } = require("gulp");
const stylish = require("jshint-stylish");

const plugins = {};
plugins.addSrc = require("gulp-add-src");
plugins.babel = require("gulp-babel");
plugins.base64 = require("gulp-base64-inline");
plugins.concat = require("gulp-concat");
plugins.cssUrlAdjuster = require("gulp-css-url-adjuster");
plugins.jshint = require("gulp-jshint");
plugins.prettyerror = require("gulp-prettyerror");
plugins.sass = require("gulp-sass");
plugins.sassLint = require("gulp-sass-lint");
plugins.uglify = require("gulp-uglify");

// 2. CONFIGURATION
// - - - - - - - - - - - - - - -
const paths = {
  src: "app/assets/",
  dist: "app/static/",
  templates: "app/templates/",
  npm: "node_modules/",
  template: "node_modules/@cdssnc/cds_template_jinja/",
  toolkit: "node_modules/govuk_frontend_toolkit/"
};

// 3. TASKS
// - - - - - - - - - - - - - - -

// Move GOV.UK template resources

const copy = {
  govuk_template: {
    template: () => {
      return src(
        paths.template + "views/layouts/notification_template.html"
      ).pipe(dest(paths.templates));
    },
    css: () => {
      return src(paths.template + "assets/stylesheets/**/*.css")
        .pipe(
          plugins.sass({
            outputStyle: "compressed"
          })
        )
        .on("error", plugins.sass.logError)
        .pipe(
          plugins.cssUrlAdjuster({
            prependRelative:
              process.env.NOTIFY_ENVIRONMENT == "development" ? "/static/" : "/"
          })
        )
        .pipe(dest(paths.dist + "stylesheets/"));
    },
    js: () => {
      return src(paths.template + "assets/javascripts/**/*.js")
        .pipe(plugins.uglify())
        .pipe(dest(paths.dist + "javascripts/"));
    },
    images: () => {
      return src(paths.template + "assets/stylesheets/images/**/*").pipe(
        dest(paths.dist + "images/")
      );
    },
    fonts: () => {
      return src(paths.template + "assets/stylesheets/fonts/**/*").pipe(
        dest(paths.dist + "fonts/")
      );
    },
    error_page: () => {
      return src(paths.src + "error_pages/**/*").pipe(
        dest(paths.dist + "error_pages/")
      );
    }
  }
};

const javascripts = () => {
  return src([
    paths.toolkit + "javascripts/govuk/modules.js",
    paths.toolkit + "javascripts/govuk/show-hide-content.js",
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
    .pipe(plugins.addSrc.prepend([paths.src + "javascripts/main.min.js"]))
    .pipe(dest(paths.dist + "javascripts/"));
};

const sass = () => {
  return src(paths.src + "/stylesheets/main*.scss")
    .pipe(plugins.prettyerror())
    .pipe(
      plugins.sass({
        outputStyle: "compressed"
      })
    )
    .pipe(plugins.base64("../.."))
    .pipe(dest(paths.dist + "stylesheets/"));
};

// copy static css
const static_css = () => {
  return src(paths.src + "/stylesheets/homepage.css").pipe(
    dest(paths.dist + "stylesheets/")
  );
};

// copy header css
const header_css = () => {
  return src(paths.src + "/stylesheets/header.css").pipe(
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
  sass: cb => {
    watch([paths.src + "stylesheets/**/*"], sass);
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

const lint = {
  sass: () => {
    return src([
      paths.src + "stylesheets/*.scss",
      paths.src + "stylesheets/components/*.scss",
      paths.src + "stylesheets/views/*.scss"
    ]);
  },
  js: cb => {
    return src(paths.src + "javascripts/**/*.js")
      .pipe(plugins.jshint())
      .pipe(plugins.jshint.reporter(stylish))
      .pipe(plugins.jshint.reporter("fail"));
  }
};

// Default: compile everything
const defaultTask = parallel(
  series(
    copy.govuk_template.template,
    copy.govuk_template.images,
    copy.govuk_template.fonts,
    copy.govuk_template.css,
    copy.govuk_template.js,
    images
  ),
  series(static_css),
  series(header_css),
  series(copy.govuk_template.error_page, javascripts, sass)
);

// Watch for changes and re-run tasks
const watchForChanges = parallel(
  watchFiles.javascripts,
  watchFiles.sass,
  watchFiles.images,
  watchFiles.self
);

exports.default = defaultTask;

exports.lint = series(lint.sass);

// Optional: recompile on changes
exports.watch = series(defaultTask, watchForChanges);
