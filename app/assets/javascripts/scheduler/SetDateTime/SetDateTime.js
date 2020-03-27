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

export const SetDateTime = () => {
  const { selected, time } = useContext(store);

  // allow radio buttons to control visibility of calendar / 'send now' value and Schedule vs Send Now buttons
  // and logic to display whether Schedule button should be disabled or not
  document.getElementById("send_now_later").onchange = (e) => {
    if(e.target.value === "1") {
      document.getElementById("schedule-send-at").classList.add("hidden");
      document.getElementById("submit-button-later").classList.remove("disabled")
      document.getElementById("submit-button-later").classList.add("hidden");
      document.getElementById("submit-button-now").classList.remove("hidden")
    } else {
      document.getElementById("schedule-send-at").classList.remove("hidden");
      document.getElementById("submit-button-later").classList.remove("hidden");
      document.getElementById("submit-button-now").classList.add("hidden")
      if(!time || selected.length === 0)
        document.getElementById("submit-button-later").classList.add("disabled");
    }
  }

  if (!document.getElementById("schedule-send-at").classList.contains("hidden")) {
    if(!time || selected.length === 0)
      document.getElementById("submit-button-later").classList.add("disabled");
    else
      document.getElementById("submit-button-later").classList.remove("disabled");
  }

  if (!time || document.getElementById("schedule-send-at").classList.contains("hidden")) {
    setDateAndTimeValue("");
    return null;
  }

  setDateAndTimeValue(`${selected[0]} ${time}`);
  return null;
};
