import React, { useContext } from "react";
import { store } from "./index";

const setDateAndTimeValue = (val, hiddenValueRef=null) => {
  if (hiddenValueRef && val) {
    hiddenValueRef.setAttribute("value", val)
  }
};

export const SetDateTime = () => {
  const { selected: selectedDate, time, hiddenValueRef } = useContext(store);

  if (!time) {
    setDateAndTimeValue("", hiddenValueRef);
    return null;
  }

  setDateAndTimeValue(`${selectedDate[0]} ${time}`, hiddenValueRef);
  return null;
};
