import React, { useContext } from "react";
import { store, yearMonthDay, getDates, onKeyDown } from "./index";
import { Days } from "./Days";

export const Weeks = () => {
  const { date, dispatch } = useContext(store);

  const weeks = getDates(date);
  return (
    <section
      id="Calendar-dates"
      onKeyDown={event => {
        const key = event.key.replace("Arrow", "");
        onKeyDown({ key, dispatch });
      }}
      aria-label="Calendar dates"
      role="application"
    >
      {weeks.map(week => {
        return (
          <div key={yearMonthDay(week[0])} className="Calendar-row">
            <Days week={week} />
          </div>
        );
      })}
    </section>
  );
};
