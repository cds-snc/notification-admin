import React from "react";
import ReactDOM from "react-dom";
import Polyglot from "node-polyglot";
import Moment from "moment";
import { getDays } from "./schedule/dateUtils";
import { ScheduleMessage } from "./schedule/ScheduleMessage";

let el = document.getElementById("schedule-send-at");

if (el) {
  const days = getDays();
  ReactDOM.render(<ScheduleMessage days={days} />, el);
}

window.moment = Moment;
window.polyglot = new Polyglot({ phrases: APP_PHRASES, locale: APP_LANG });