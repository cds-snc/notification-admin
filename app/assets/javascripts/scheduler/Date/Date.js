import React, { useContext } from "react";
import { store } from "./index";
import dayjs from "dayjs";

const formattedDay = (day) => {
  return dayjs(day).format("dddd, MMMM DD YYYY");
};

export const Date = () => {
  const { selected } = useContext(store);
  const date = selected[0];

  if (!date) {
    return <span className="date-display"></span>;
  }
  const txt = formattedDay(selected[0]);
  return <span className="date-display">{txt}</span>;
};
