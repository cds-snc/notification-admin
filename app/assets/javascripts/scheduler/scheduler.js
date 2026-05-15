import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

/**
 * Call the module function `render` by passing the element upon which to
 * render the scheduler.
 */
export const load = function (element) {
  const root = createRoot(element);
  root.render(<App />);
};

// Expose as window global for webpackLoader.js compatibility
if (typeof window !== "undefined") {
  window.Scheduler = { load };
}
