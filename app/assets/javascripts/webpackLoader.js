(function (Modules) {
    "use strict";

    const attrComponentName = "data-webpack-loader";

    function init($component) {
      const webpackLoaderName = $component.attr(attrComponentName);
      if (!webpackLoaderName) return;
      const webpackLoader = window[webpackLoaderName];
      if (!webpackLoader) return;
      webpackLoader.load($component[0]);
    }
  
    Modules.WebpackLoader = function () {
      this.start = function (component) {
        let $component = $(component);
        init($component);
      };
    };
  })(window.GOVUK.Modules);
  