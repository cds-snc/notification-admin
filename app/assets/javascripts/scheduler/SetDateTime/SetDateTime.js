import React, { useContext } from "react";
import { store } from "./index";

const setDateAndTimeValue = val => {
  const ref = document.getElementById("scheduled_for");

  let value = val;

  if (window.moment && val) {
    value = moment(val)
      .utc()
      .format()
      .replace("Z", "");
  }

  if (ref) {
    ref.setAttribute("value", value);
  }
};

const refreshSchedule = (selected, time) => {
  if (!time || selected.length === 0 || document.getElementById("js-schedule-send-at").classList.contains("hidden")) {
    setDateAndTimeValue("");
    return null;
  }

  setDateAndTimeValue(`${selected[0]} ${time}`);
  return null;
};

export const SetDateTime = () => {
  const { selected, time } = useContext(store);

  // Click the "Send later" button.
  // Show or hide the scheduler UI and reset the scheduled time if needed
  document.getElementById("js-send-later-button").onclick = (e) => {
    e.stopPropagation();
    e.preventDefault();
    document.getElementById("js-schedule-send-at").classList.toggle("hidden");
    document.getElementById("js-schedule-button").classList.toggle("hidden");
    refreshSchedule(selected, time);
  }

  // Clicking the "Send now" button.
  // Always reset the scheduled time, if set
  document.getElementById("js-send-now-button").onclick = (e) => {
    setDateAndTimeValue("");
    return null;
  }

  refreshSchedule(selected, time);
  return null;
};
