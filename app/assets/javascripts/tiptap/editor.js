import React from "react";
import ReactDOM from "react-dom";
import SimpleEditor from "./SimpleEditor";

/**
 * Call the module function `load` by passing the element upon which to
 * render the editor.
 */
export const load = function (
  element,
  id,
  labelId,
  initialContent,
  lang = "en",
) {
  ReactDOM.render(
    <SimpleEditor
      inputId={id}
      labelId={labelId}
      initialContent={initialContent}
      lang={lang}
    />,
    element,
  );
};
