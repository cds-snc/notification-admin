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
    <div
      className="Calendar-days Calendar-row"
      aria-disabled="true"
      role="presentation"
      aria-hidden="true"
    >
      {weekdays.map((day) => {
        return (
          <span
            key={day.shortname}
            className="Calendar-item Calendar-item--day"
            aria-label={day.fullname}
          >
            {day.shortname}
          </span>
        );
      })}
    </div>
  );
};
