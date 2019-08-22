import React from "react";

const DayButton = ({ label, date, handleClick = () => {}, ...props }) => {
  return (
    <input
      onClick={handleClick}
      type="button"
      data-date={date}
      value={label}
      {...props}
    />
  );
};

export const DayButtons = ({ currentDayLabel, handleClick, days }) => {
  return (
    <div className="day-select radio-select">
      <div className="radio-select-column">
        {days.map(day => {
          const className = currentDayLabel === day.label ? "selected" : "";
          return (
            <DayButton
              className={`js-category-button ${className}`}
              key={day.label}
              label={day.label}
              date={day.date}
              handleClick={handleClick}
            />
          );
        })}
      </div>
    </div>
  );
};
