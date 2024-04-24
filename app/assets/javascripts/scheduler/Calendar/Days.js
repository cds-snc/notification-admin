import React, { useContext } from "react";
import { Day } from "./Day";
import { store, parseMonth, yearMonthDay } from "./index";

export const Days = ({ week }) => {
  const { date } = useContext(store);
  const month = parseMonth(date);
  return week.map((day) => {
    if (Number(day.$M) + 1 !== Number(month)) {
      return (
        <span
          key={yearMonthDay(day)}
          className="Calendar-item Calendar-item--empty"
        ></span>
      );
    }

    return <Day key={yearMonthDay(day)} day={day} />;
  });
};
