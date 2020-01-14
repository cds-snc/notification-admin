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

  if (!time) {
    setDateAndTimeValue("");
    return null;
  }

  setDateAndTimeValue(`${selectedDate[0]} ${time}`);
  return null;
};
