import React, { useContext } from "react";
import { Date } from "../Date/Date";
import { Toggle } from "../Toggle/Toggle";
import { Time } from "../Time/Time";
import { store } from "./index";

export const DateTime = () => {
  const { selected } = useContext(store);

  if (typeof selected[0] === "undefined") {
    return null;
  }

  return (
    <div className="column">
      <div className="selected-date-time-box">
        <div className="triangle"></div>
        <div className="date-time-box">
          <Date />
          <Time name="time" />
          <Toggle />
        </div>
      </div>
    </div>
  );
};
