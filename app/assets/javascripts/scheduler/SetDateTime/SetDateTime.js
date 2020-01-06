import React, { useContext } from "react";
import { store } from "./index";

const setDateAndTimeValue = val => {
  const ref = document.getElementById("scheduled_for");

  let value = val;

  if (window.moment) {
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
  setDateAndTimeValue(`${selectedDate[0]} ${time}`);
  return null;
};
