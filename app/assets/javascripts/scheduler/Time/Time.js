import React, { useState, useContext } from "react";
import { store, populateTimes, dateIsToday } from "./index";
import "./style.css";

export const Time = ({ name }) => {
  const { _24hr, today, selected: selectedDate } = useContext(store);

  let startTime = 0;

  if (dateIsToday(today, selectedDate[0])) {
    const d = new Date();
    startTime = Number(d.getHours() + 1) * 60;
  }

  const values = populateTimes(_24hr, startTime);
  const [selected, setSelected] = useState("09:00");
  return (
    <div className="Nav--select">
      <select
        onChange={event => {
          setSelected(event.currentTarget.value);
        }}
        id={name}
        aria-label={name}
        value={selected}
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
