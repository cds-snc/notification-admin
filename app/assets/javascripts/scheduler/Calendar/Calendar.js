import React, { useContext } from "react";
import { YearMonth } from "./YearMonth";
import { DaysOfTheWeek } from "./DaysOfTheWeek";
import { Weeks } from "./Weeks";
import { Announce } from "./Announce";
import { I18nContext } from "./index";

// Note:
// Inspired by "A New Day: Making a Better Calendar"
// https://www.24a11y.com/2018/a-new-day-making-a-better-calendar

export const Calendar = () => {
  const { translate } = useContext(I18nContext);
  return (
    <div className="date-time">
      <section className="Calendar" aria-label={translate("calendar")}>
        <YearMonth />
        <div className="Calendar-grid">
          <DaysOfTheWeek />
          <Weeks />
        </div>
        <Announce msg="" />
      </section>
    </div>
  );
};
