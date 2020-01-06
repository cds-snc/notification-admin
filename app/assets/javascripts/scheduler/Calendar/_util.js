import dayjs from "dayjs";

export const isBlockedDay = (day, state) => {
  return (
    day.isBefore(state.today) ||
    day.isBefore(state.firstAvailableDate) ||
    dayjs(day).isAfter(state.lastAvailableDate)
  );
};

export const formattedDay = day => {
  return dayjs(day).format("dddd MMMM DD YYYY");
};

export const yearMonthDay = day => {
  return dayjs(day).format("YYYY-MM-DD");
};

export const getFirstDay = date => {
  return dayjs(date)
    .startOf("month")
    .format("D");
};

export const getLastDay = date => {
  return dayjs(date)
    .endOf("month")
    .format("D");
};

export const parseDay = date => {
  return dayjs(date).format("D");
};

export const parseMonth = date => {
  return dayjs(date).format("MM");
};

export const parseYear = date => {
  return dayjs(date).format("YYYY");
};

export const getDates = date => {
  let start = dayjs(date)
    .startOf("month")
    .startOf("week")
    .subtract(1, "day");

  let end = dayjs(date)
    .endOf("month")
    .endOf("week")
    .subtract(1, "day");

  let calendar = [];

  while (start.isBefore(end)) {
    calendar.push(
      Array(7)
        .fill(0)
        .map(() => {
          start = start.add(1, "day");
          return start;
        })
    );
  }

  return calendar;
};

export const setSelected = (arr, date, multi = false) => {
  const index = isSelected(arr, date);

  // toggle this value if it's already been set
  if (index !== -1) {
    const cleaned = arr.filter(e => {
      return e !== date;
    });

    return cleaned;
  }

  if (multi) {
    return [...arr, date];
  }

  return [date];
};

export const isSelected = (arr, date) => {
  return arr.findIndex(val => val === date);
};

const pastFirstDayInMonth = (day, state) => {
  if (Number(state.focusedDayNum) === 1) {
    const newMonth = dayjs(state.date)
      .subtract(1, "month")
      .format("YYYY-MM-DD");

    if (dayjs(newMonth).isBefore(yearMonthDay(state.firstAvailableDate))) {
      return { updateMessage: "At start of calendar" };
    }

    return {
      updateMessage: "",
      date: newMonth,
      focusedDayNum: Number(getLastDay(newMonth))
    };
  }
  return { updateMessage: "" };
};

const pastLastDayInMonth = (day, state) => {
  if (Number(state.focusedDayNum) === Number(state.lastDay)) {
    const newMonth = dayjs(state.date)
      .add(1, "month")
      .format("YYYY-MM-DD");

    if (dayjs(newMonth).isAfter(yearMonthDay(state.lastAvailableDate))) {
      return { updateMessage: "At end of calendar" };
    }

    return { updateMessage: "", date: newMonth, focusedDayNum: 1 };
  }

  return { updateMessage: "" };
};

export const getNextDay = (day, state, direction) => {
  if (day <= 0) {
    return pastFirstDayInMonth(day, state);
  }

  if (direction != "left" && day > state.lastDay) {
    return pastLastDayInMonth(day, state);
  }

  return { updateMessage: "", focusedDayNum: day };
};
