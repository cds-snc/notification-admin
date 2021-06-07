import React, { useContext } from "react";
import { store, I18nContext } from "./index";
import dayjs from "dayjs";

const prevNav = (date, firstAvailableDate) => {
  const prevMonth = dayjs(date).subtract(1, "month").format("YYYY-MM-DD");

  if (dayjs(prevMonth).isBefore(firstAvailableDate, "month")) {
    return ["Calendar-nav--button--unavailable"];
  }

  return [];
};

const nextNav = (date, lastAvailableDate) => {
  const nextMonth = dayjs(date).add(1, "month").date(1).format("YYYY-MM-DD");

  if (dayjs(nextMonth).isAfter(lastAvailableDate)) {
    return ["Calendar-nav--button--unavailable"];
  }

  return [];
};

export const YearMonth = () => {
  const { date, firstAvailableDate, lastAvailableDate, dispatch } =
    useContext(store);

  const { translate } = useContext(I18nContext);

  return (
    <section aria-label="Calendar Navigation" className="Calendar-nav">
      <button
        id="previous"
        className={[
          "Calendar-nav--button",
          ...prevNav(date, firstAvailableDate),
        ].join(" ")}
        type="button"
        aria-label={translate("previous_month")}
        onClick={() => {
          dispatch({
            type: "SELECT_PREVIOUS",
            payload: "previous",
          });
        }}
      >
        &#10094;
      </button>
      <div className="Nav--month">{dayjs(date).format("MMMM")}</div>
      <button
        id="next"
        className={[
          "Calendar-nav--button",
          ...nextNav(date, lastAvailableDate),
        ].join(" ")}
        type="button"
        aria-label={translate("next_month")}
        onClick={() => {
          dispatch({
            type: "SELECT_NEXT",
            payload: "next",
          });
        }}
      >
        &#10095;
      </button>
    </section>
  );
};
