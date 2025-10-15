import dayjs from "dayjs";

export const getFirstAvailableDay = (day, state) => {
  if (dayjs(day).isSame(state.firstAvailableDate, "day")) {
    return parseDay(state.firstAvailableDate);
  }

  if (state.isBlockedDay(day)) {
    return parseDay(state.firstAvailableDate);
  }

  return 1;
};

export const formattedDay = (day) => {
  return dayjs(day).format("dddd MMMM DD YYYY");
};

export const yearMonthDay = (day) => {
  return dayjs(day).format("YYYY-MM-DD");
};

export const parseDay = (date) => {
  return dayjs(date).format("D");
};

export const parseMonth = (date) => {
  return dayjs(date).format("MM");
};

export const parseYear = (date) => {
  return dayjs(date).format("YYYY");
};

export const getFirstDay = (date) => {
  return dayjs(date).startOf("month").format("D");
};

export const getLastDay = (date) => {
  return dayjs(date).endOf("month").format("D");
};

export const getDates = (date) => {
  let start = dayjs(date).startOf("month").startOf("week").subtract(1, "day");

  let end = dayjs(date).endOf("month").endOf("week").subtract(1, "day");

  let calendar = [];

  while (start.isBefore(end)) {
    calendar.push(
      Array(7)
        .fill(0)
        .map(() => {
          start = start.add(1, "day");
          return start;
        }),
    );
  }

  return calendar;
};

export const isSelected = (arr, date) => {
  return arr.findIndex((val) => val === date);
};

export const setSelected = (arr, date, multi = false) => {
  const index = isSelected(arr, date);

  // toggle this value if it's already been set
  if (index !== -1) {
    const cleaned = arr.filter((e) => {
      return e !== date;
    });

    return cleaned;
  }

  if (multi) {
    return [...arr, date];
  }

  return [date];
};

// rename to isBeforeFirstDayInMonth
export const beforeFirstDayInMonth = (state) => {
  if (Number(state.focusedDayNum) === 1) {
    // state.date is the YYYY-MM-DD on the calendar display not the current date
    const newMonth = dayjs(state.date)
      .subtract(1, "month")
      .endOf("month")
      .format("YYYY-MM-DD");

    if (dayjs(newMonth).isBefore(yearMonthDay(state.firstAvailableDate))) {
      return { updateMessage: "at_start_of_calendar" };
    }

    return {
      updateMessage: "",
      date: newMonth,
      focusedDayNum: Number(getLastDay(newMonth)),
    };
  }
  return { updateMessage: "" };
};

export const afterLastDayInMonth = (state) => {
  if (Number(state.focusedDayNum) === Number(state.lastDay)) {
    // Create a new date by adding one month, and setting date to the 1st of the added month
    const newMonth = dayjs(state.date)
      .add(1, "month")
      .date(1)
      .format("YYYY-MM-DD");

    if (dayjs(newMonth).isAfter(yearMonthDay(state.lastAvailableDate))) {
      return { updateMessage: "at_end_of_calendar" };
    }

    return { updateMessage: "", date: newMonth, focusedDayNum: 1 };
  }

  return { updateMessage: "" };
};

export const getNextDay = (day, state, direction) => {
  if (day <= 0) {
    // console.log("get date before", day, state, direction);

    return beforeFirstDayInMonth(state);
  }

  if (direction !== "left" && Number(day) > Number(state.lastDay)) {
    // console.log("get date after", day, state, direction);

    return afterLastDayInMonth(state);
  }

  // Handle first/last available day navigation
  if (direction === "first") {
    const firstAvailableMonth = yearMonthDay(state.firstAvailableDate);
    const firstAvailableDay = parseDay(state.firstAvailableDate);
    
    if (state.date !== firstAvailableMonth) {
      return {
        updateMessage: "",
        date: firstAvailableMonth,
        focusedDayNum: Number(firstAvailableDay)
      };
    }
    return { updateMessage: "", focusedDayNum: Number(firstAvailableDay) };
  }

  if (direction === "last") {
    const lastAvailableMonth = yearMonthDay(state.lastAvailableDate);
    const lastAvailableDay = parseDay(state.lastAvailableDate);
    
    if (state.date !== lastAvailableMonth) {
      return {
        updateMessage: "",
        date: lastAvailableMonth,
        focusedDayNum: Number(lastAvailableDay)
      };
    }
    return { updateMessage: "", focusedDayNum: Number(lastAvailableDay) };
  }

  return { updateMessage: "", focusedDayNum: day };
};
