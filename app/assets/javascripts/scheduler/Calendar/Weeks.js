import React, { useContext } from "react";
import { store, I18nContext, yearMonthDay, getDates, onKeyDown } from "./index";
import { Days } from "./Days";

export const Weeks = () => {
  const { date, dispatch } = useContext(store);
  const { translate } = useContext(I18nContext);
  const weeks = getDates(date);
  return (
    <section
      id="Calendar-dates"
      onKeyDown={(event) => {
        const key = event.key.replace("Arrow", "");
        onKeyDown({ key, dispatch });
      }}
      aria-label={translate("calendar_dates")}
      role="application"
    >
      {weeks.map((week) => {
        return (
          <div key={yearMonthDay(week[0])} className="Calendar-row">
            <Days week={week} />
          </div>
        );
      })}
    </section>
  );
};
