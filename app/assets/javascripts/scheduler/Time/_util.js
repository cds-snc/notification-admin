import dayjs from "dayjs";

export const populateTimes = (_24hr = false, date) => {
  const startTime = 0;
  let times = [];
  let hours, hours24, minutes, ampm;

  for (let i = startTime; i <= 1380; i += 60) {
    hours = Math.floor(i / 60);
    hours24 = Math.floor(i / 60);

    minutes = i % 60;
    if (minutes < 10) {
      minutes = "0" + minutes; // adding leading zero
    }

    ampm = "";
    ampm = hours % 24 < 12 ? "AM" : "PM";
    hours = hours % 12;
    if (hours === 0) {
      hours = 12;
    }

    if (hours24 < 10) {
      hours24 = "0" + hours24; // adding leading zero
    }

    let postfix = ampm ? ` ${ampm}` : "";
    let label = `${hours24}:${minutes}`;

    if (_24hr === "off") {
      label = `${hours}:${minutes}${postfix}`;
    }

    times.push({ val: `${hours24}:${minutes}`, label });
  }

  return times;
};

export const dateIsToday = (date) => {
  const today = dayjs()
    .set("hour", 0)
    .set("minute", 0)
    .set("second", 0)
    .set("millisecond", 0);

  return today.isSame(dayjs(date[0]), "day");
};

export const dateIsLastAvailable = (date, lastAvailableDate) => {
  return dayjs(date[0]).isSame(dayjs(lastAvailableDate), "day");
};

export const timeValuesToday = (selected, time_values) => {
  const today = dayjs();

  return time_values.filter((time) => {
    const t = dayjs(selected + "T" + time.val);
    return t.isAfter(today);
  });
};

export const timeValuesLastDay = (day, time_values) => {
  const lastTime = dayjs().add(96, "hour");

  return time_values.filter((time) => {
    const t = dayjs(day + "T" + time.val);
    return t.isBefore(lastTime);
  });
};
