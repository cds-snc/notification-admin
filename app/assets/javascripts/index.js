import React from "react";
import ReactDOM from "react-dom";
import Polyglot from "node-polyglot";
import Moment from "moment";
// import { getDays } from "./schedule/dateUtils";
// import { ScheduleMessage } from "./schedule/ScheduleMessage";
import { App } from "./scheduler/App";
import { DiffDOM } from "diff-dom";
import Swal from "sweetalert2";

if (!window.APP_PHRASES || typeof APP_PHRASES === "undefined") {
  window.APP_PHRASES = {
    now: "Now"
  };
}

if (!window.APP_LANG || typeof APP_LANG === "undefined") {
  window.APP_LANG = "en";
}

let el = document.getElementById("schedule-send-at");

window.moment = Moment;
window.DiffDOM = DiffDOM;

window.polyglot = new Polyglot({ phrases: APP_PHRASES || {}, locale: APP_LANG });
window.Swal = Swal;

let nowLabel = "Now Label";

if (window.polyglot.t) {
  nowLabel = window.polyglot.t("now");
}

window.swapSendButtonText = function() {
  // swap between 'Send Now' and 'Schedule' text on calendar page based on whether
  // schedule feature is being used or not
  if (document.getElementById("submit-button").innerHTML === window.polyglot.t("send_now")) {
    document.getElementById("submit-button").innerHTML = window.polyglot.t("send_later");
  } else {
    document.getElementById("submit-button").innerHTML = window.polyglot.t("send_now");
  }
}

if (el) {
  ReactDOM.render(<App />, el);
}
