(function () {
  "use strict";

  const root = this || window;
  const $ = root.jQuery;

  let branding_style = $(
    '.multiple-choice input[name="branding_style"]:checked',
  );

  if (!branding_style.length) {
    return;
  }

  branding_style = branding_style.val();

  const $paneWrapper = $(
    '<div class="w-full float-left py-0 px-0 px-gutterHalf box-border"></div>',
  );
  const $form = $("form");
  const previewType = $form.data("previewType");
  const $previewPane = $(
    `<iframe src="/_${previewType}?${buildQueryString([
      "branding_style",
      branding_style,
    ])}" class="branding-preview" width="600px" height="345px"></iframe>`,
  );

  function buildQueryString() {
    return $.map(
      arguments,
      (val, idx) => encodeURI(val[0]) + "=" + encodeURI(val[1]),
    ).join("&");
  }

  function setPreviewPane(e) {
    const $target = $(e.target);
    if ($target.attr("name") == "branding_style") {
      branding_style = $target.val();
    }
    $previewPane.attr(
      "src",
      `/_${previewType}?${buildQueryString([
        "branding_style",
        branding_style,
      ])}`,
    );
  }

  $paneWrapper.append($previewPane);
  $form.find(".grid-row").eq(0).prepend($paneWrapper);
  $form.attr(
    "action",
    location.pathname.replace(
      new RegExp(`set-${previewType}-branding$`),
      `preview-${previewType}-branding`,
    ),
  );

  $("fieldset").on("change", 'input[name="branding_style"]', setPreviewPane);
})();
