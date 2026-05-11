import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";

/**
 * Call the module function `render` by passing the element upon which to
 * render the scheduler.
 */
export const load = function (element) {
  ReactDOM.render(<App />, element);
};

// Expose as window global for webpackLoader.js compatibility
if (typeof window !== "undefined") {
  window.Scheduler = { load };
}
