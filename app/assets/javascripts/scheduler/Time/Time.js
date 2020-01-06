import React, { useState, useContext } from "react";
import { store, populateTimes, dateIsToday } from "./index";
import "./style.css";

export const Time = ({ name }) => {
  const { _24hr, today, selected: selectedDate, time, dispatch } = useContext(
    store
  );

  let startTime = 0;

  if (dateIsToday(today, selectedDate[0])) {
    const d = new Date();
    startTime = Number(d.getHours() + 1) * 60;
  }

  const values = populateTimes(_24hr, startTime);
  return (
    <div className="Nav--select">
      <select
        onChange={event => {
          const time = event.currentTarget.value;
          dispatch({
            type: "SELECT_TIME",
            payload: time
          });
        }}
        id={name}
        aria-label={name}
        value={time}
      >
        {values.map(item => {
          return (
            <option key={item.label} value={item.val}>
              {item.label}
            </option>
          );
        })}
      </select>
    </div>
  );
};
