import React from "react";
import dayjs from "dayjs";

const weekdays = Array(7)
  .fill()
  .map((item, index) => {
    const day = dayjs().day(index);
    return { fullname: day.format("dddd"), shortname: day.format("dd") };
  });

export const DaysOfTheWeek = () => {
  return (
    <div className="Calendar-days Calendar-row" aria-hidden="false">
      {weekdays.map(day => {
        return (
          <span
            key={day.shortname}
            aria-label={day.fullname}
            className="Calendar-item Calendar-item--day"
          >
            {day.shortname}
          </span>
        );
      })}
    </div>
  );
};
