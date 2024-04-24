import React, { useContext } from "react";
import {
  store,
  timeValuesToday,
  dateIsToday,
  timeValuesLastDay,
} from "./index";
import { dateIsLastAvailable } from "./_util";

export const Time = ({ name }) => {
  const { time, time_values, dispatch, selected, lastAvailableDate } =
    useContext(store);

  // if today, check valid time values
  let valid_time_values = dateIsToday(selected)
    ? timeValuesToday(selected, time_values)
    : time_values;

  // if last available day cull times after current hour
  if (dateIsLastAvailable(selected, lastAvailableDate)) {
    valid_time_values = timeValuesLastDay(selected, time_values);
  }

  return (
    <div className="Nav--select">
      <select
        onChange={(event) => {
          const time = event.currentTarget.value;
          dispatch({
            type: "SELECT_TIME",
            payload: time,
          });
        }}
        id={name}
        aria-label={name}
        value={time}
      >
        {valid_time_values.map((item) => {
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
