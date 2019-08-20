import React from "react";
import ReactDOM from "react-dom";
import Polyglot from "node-polyglot";
import Moment from "moment";
window.moment = Moment;
window.polyglot = new Polyglot({ phrases: APP_PHRASES, locale: APP_LANG });

import ScheduleMessage from "./schedule-send";

let App = document.getElementById("schedule-send-at");

ReactDOM.render(
  <ScheduleMessage
    submitLabel="Send 5 emails"
    amPM="AM"
    initialHour="10"
    days={["Now", "Later Today", "Tomorrow", "Wednesday", "Thursday"]}
  />,
  App
);
