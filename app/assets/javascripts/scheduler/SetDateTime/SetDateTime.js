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
  const { selected: selectedDate, time } = useContext(store);

  if (!time || document.getElementById("schedule-send-at").classList.contains("hidden")) {
    setDateAndTimeValue("");
    return null;
  }

  // allow radio buttons to control visibility of calendar / 'send now' value
  document.getElementById("send_now_later").onchange = (e) => {
    if(e.target.value === "1") {
      setDateAndTimeValue("");
      document.getElementById("schedule-send-at").classList.add("hidden");
    } else {
      document.getElementById("schedule-send-at").classList.remove("hidden");
    }
  }

  setDateAndTimeValue(`${selectedDate[0]} ${time}`);
  return null;
};
