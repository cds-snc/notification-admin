import React from "react";
import ReactDOM from "react-dom";
import { App } from "./App";

/**
 * Call the module function `render` by passing the element upon which to
 * render the scheduler.
 */
export const render = function (element) {
  ReactDOM.render(<App />, element);
};
