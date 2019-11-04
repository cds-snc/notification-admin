import moment from "moment";

export const getDays = nowLabel => {
  let data = [
    {
      label: nowLabel,
      date: moment(new Date())
        .utc()
        .format("YYYY-MM-DD")
    }
  ];

  // Maximum seems to be four days - generate all ranges for those hours
  for (let i = 0; i < 4; i++) {
    let date =
      i == 0
        ? moment().add(i, "days")
        : moment()
            .add(i, "days")
            .startOf("day");
    let dayName = moment(date)
      .calendar()
      .split("at ")[0]; // Friday at 12:00

    data.push({
      label: dayName,
      date: date.utc().format("YYYY-MM-DD")
    });
  }

  return data;
};

export const convertTime12to24 = time12h => {
  const [time, modifier] = time12h.split(" ");

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = parseInt(hours, 10) + 12;
  }

  if (hours > 1 && hours < 10) {
    hours = "0" + String(hours);
  }

  return `${hours}:${minutes}:00`;
};

export const getDateFromString = ({ hour, amPM, currentDate }) => {
  const time = convertTime12to24(`${hour}:00 ${amPM}`);
  return moment(`${currentDate} ${time}`)
    .utc()
    .format()
    .replace("Z", "");
};

export const getCurrentTime = () => {
  //let defaultDate = "2019-08-21 20:45";
  let defaultDate = undefined;
  // @todo fix hrs approaching midnight
  const time = moment(defaultDate)
    .add(1, "hours")
    .format("h A");
  const arr = time.split(" ");
  return { hour: arr[0], amPM: arr[1] };
};

export const getMinHour = ({ isToday, amPM }) => {
  if (amPM === "AM" && isToday) {
    return getCurrentTime().hour;
  }

  if (
    amPM === "PM" &&
    getCurrentTime().amPM === "PM" &&
    getCurrentTime().hour != 12 &&
    isToday
  ) {
    return getCurrentTime().hour;
  }

  return 1;
};

export const getMaxHour = () => {
  return 12;
};

export const todayIsSelected = label => {

  let today = "Today"

  if (window.polyglot.t) {
    today = window.polyglot.t("today");
  }

  if (label.trim() === today.trim()) {
    return true;
  }

  return false;
};

export const isInPast = ({ hour, amPM, currentDate }) => {
  const time = convertTime12to24(`${hour}:00 ${amPM}`);
  const current = new Date(`${currentDate} ${time}`);

  if (new Date() >= current) {
    return true;
  }
  return false;
};
