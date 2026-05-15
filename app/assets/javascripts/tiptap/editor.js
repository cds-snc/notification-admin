import React from "react";
import { createRoot } from "react-dom/client";
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
  modeInputId,
  initialMode,
  preferenceUpdateUrl,
  csrfToken,
) {
  const root = createRoot(element);
  root.render(
    <SimpleEditor
      inputId={id}
      labelId={labelId}
      initialContent={initialContent}
      lang={lang}
      modeInputId={modeInputId}
      initialMode={initialMode}
      preferenceUpdateUrl={preferenceUpdateUrl}
      csrfToken={csrfToken}
    />,
  );
};

// Expose as window global for dynamic script loading compatibility
if (typeof window !== "undefined") {
  window.Tiptap = { load };
}
