(function (Modules) {
    "use strict";

    const attrComponentName = "data-react-render-component";

    function init($component) {
      const reactComponentName = $component.attr(attrComponentName);
      if (!reactComponentName) return;
      const reactComponent = window[reactComponentName];
      if (!reactComponent) return;
      reactComponent.render($component[0]);
    }
  
    Modules.ReactRender = function () {
      this.start = function (component) {
        let $component = $(component);
        init($component);
      };
    };
  })(window.GOVUK.Modules);
  