import React from "react";
import ReactDOM from "react-dom";
import Polyglot from "node-polyglot";
import Moment from "moment";
// import { getDays } from "./schedule/dateUtils";
// import { ScheduleMessage } from "./schedule/ScheduleMessage";
import { App } from "./scheduler/App";
import { DiffDOM } from "diff-dom";
import Swal from "sweetalert2";

let el = document.getElementById("schedule-send-at");

window.moment = Moment;
window.DiffDOM = DiffDOM;
window.polyglot = new Polyglot({ phrases: APP_PHRASES, locale: APP_LANG });
window.Swal = Swal;

let nowLabel = "Now Label";

if (window.polyglot.t) {
  nowLabel = window.polyglot.t("now");
}

if (el) {
  ReactDOM.render(<App />, el);
}

/*
if (!window.APP_PHRASES || typeof APP_PHRASES === "undefined") {
  APP_PHRASES = {
    now: "Now"
  };
}

if (!window.APP_LANG || typeof APP_LANG === "undefined") {
  APP_LANG = "en";
}
*/
