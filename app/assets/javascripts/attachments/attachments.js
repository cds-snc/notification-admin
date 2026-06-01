import React from "react";
import { createRoot } from "react-dom/client";
import { AttachmentsWidget } from "./AttachmentsWidget";

export const load = function (element, props = {}) {
  const resolvedProps = { ...props };

  if (!resolvedProps.lang && typeof window !== "undefined") {
    resolvedProps.lang = window.APP_LANG || "en";
  }

  if (typeof resolvedProps.onAttachFilesHandler === "string") {
    const handler = window[resolvedProps.onAttachFilesHandler];
    if (typeof handler === "function") {
      resolvedProps.onAttachFiles = handler;
    }
  }

  const root = createRoot(element);
  root.render(<AttachmentsWidget {...resolvedProps} />);
};

if (typeof window !== "undefined") {
  window.Attachments = { load };
}
