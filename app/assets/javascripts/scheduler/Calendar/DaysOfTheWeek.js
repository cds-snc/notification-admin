import React from "react";

export const DaysOfTheWeek = () => {
  const weekdays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  return (
    <div className="Calendar-days Calendar-row" aria-hidden="false">
      {weekdays.map(day => {
        return <span key={day} className="Calendar-item Calendar-item--day">{day}</span>;
      })}
    </div>
  );
};
