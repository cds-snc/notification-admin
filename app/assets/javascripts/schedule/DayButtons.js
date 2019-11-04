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

          const dayLabelKey = day.label.toLowerCase();
          let dayTxt = dayLabelKey;

          if (window.polyglot.t) {
            dayTxt = window.polyglot.t(dayLabelKey.trim());
          }

          return (
            <DayButton
              className={`js-category-button ${className}`}
              key={day.label}
              label={dayTxt}
              date={day.date}
              handleClick={handleClick}
            />
          );
        })}
      </div>
    </div>
  );
};
