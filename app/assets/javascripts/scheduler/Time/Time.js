import React, { useContext } from "react";
import { store, timeValuesToday, dateIsToday } from "./index";

export const Time = ({ name }) => {
  const { time, time_values, dispatch, selected } = useContext(store);

  // if today, check valid time values
  const valid_time_values = dateIsToday(selected) ? timeValuesToday(selected, time_values) : time_values;
  
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
        {valid_time_values.map(item => {
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
