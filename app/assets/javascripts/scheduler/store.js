import React, { createContext, useReducer } from "react";
import {
  dateIsLastAvailable,
  dateIsToday,
  populateTimes,
  timeValuesLastDay,
  timeValuesToday,
} from "./Time/_util";
import dayjs from "dayjs";
import "dayjs/locale/fr-ca";
import {
  setSelected,
  parseDay,
  getFirstDay,
  getLastDay,
  getNextDay,
  yearMonthDay,
  getFirstAvailableDay
} from "./Calendar/index";

const LANGUAGES = ["en", "fr-ca"]; // en
const LOCALE = window.APP_LANG === "en" ? LANGUAGES[0] : LANGUAGES[1];

dayjs.locale(LOCALE); // global

const defaultToday = dayjs().startOf("date");
const defautFirstDay = dayjs(defaultToday);

// Note: date = YYYY-MM-DD on the calendar display not the current date
// date - updates on prev / next month click

export const defaultState = (
  data = {
    today: defaultToday,
    firstDay: defautFirstDay
  }
) => {
  let { today, firstDay } = data.defaultState ? data.defaultState: data;

  const blockedDay = day => {
    const beforeFirstDay = firstDay ? dayjs(day).isBefore(firstDay) : false;
    return (
      today > day ||
      beforeFirstDay ||
      dayjs(day).isAfter(lastAvailableDate)
    );
  };

  const time_values = populateTimes(LOCALE === "en" ? "off" : "on");
  let timeValuesTodayLeft = timeValuesToday([yearMonthDay(firstDay)], time_values);

  let selectedTimeValue = null;
  // Select first available time slot only if there are some left for the
  // current day, i.e. hour is less than 23h00.
  if (timeValuesTodayLeft && timeValuesTodayLeft.length > 0) {
    selectedTimeValue = timeValuesTodayLeft[0].val;
  }
  // If there are no time slots remaining in the current day, we are past
  // 23h00 and we need to shift forward the first available day for scheduling.
  else {
    const tomorrow = dayjs().add(1, 'day').startOf("date");
    firstDay = tomorrow;
    selectedTimeValue = time_values[0].val;
  }

  let lastAvailableDate;
  lastAvailableDate = dayjs(firstDay).add(96, "hour");

  return {
    today,
    firstAvailableDate: firstDay,
    lastAvailableDate: lastAvailableDate,
    date: yearMonthDay(firstDay),
    selected: [yearMonthDay(firstDay)],
    focusedDayNum: dayjs(firstDay).format("D"),
    updateMessage: "",
    _24hr: LOCALE === "en" ? "off" : "on",
    errors: "",
    time: selectedTimeValue,
    time_values: time_values,
    isBlockedDay: blockedDay
  };
};

let options = {};

options = { setIntialState: defaultState, ...window.schedulerOptions };

const initialState = options.setIntialState();

export const setIntialState = options.setIntialState;

export const store = createContext(initialState);

const { Provider } = store;

export const StateProvider = ({ value, children }) => {
  const mergedState = { ...initialState, ...value };
  const [state, dispatch] = useReducer((state, action) => {
    let newState = {};
    switch (action.type) {
      case "AM_PM":
        newState = {
          ...state,
          _24hr: action.payload,
          time_values: populateTimes(action.payload),
          updateMessage:
            action.payload === "off"
              ? "24 hr time selected"
              : "AM PM time selected "
        };
        break;
      case "CALENDAR_UPDATES":
        newState = { ...state, updateMessage: action.payload };
        break;
      case "SELECT_TIME":
        newState = { ...state, time: action.payload };
        break;
      case "TIME_VALUES":
        newState = { ...state, time_values: action.payload };
        break;
      case "SELECT_DATE":
        if (state.isBlockedDay(dayjs(action.payload))) {
          newState = { ...state };
        } else {
          let newTime = dateIsToday([action.payload]) ? timeValuesToday([action.payload], state.time_values)[0].val : state.time;
          const isLastDay = dateIsLastAvailable([action.payload], state.lastAvailableDate);
          // If selecting the last day, make sure we don't select a
          // time after the latest valid datetime
          if (isLastDay) {
            const timeValuesForLastDay = timeValuesLastDay(action.payload, state.time_values);
            const validTime = timeValuesForLastDay.map(t => t.val).includes(newTime);
            newTime = !validTime ? timeValuesForLastDay[timeValuesForLastDay.length - 1].val : newTime;
          }

          newState = {
            ...state,
            selected: setSelected(state.selected, action.payload),
            focusedDayNum: parseDay(action.payload),
            time: newTime
          };

          newState.errors = "";
          /*
          if (
            newState.selected.length === 0
          ) {
            // show deselect error
            newState.errors = [
              {
                id: "1",
                text: "Date must be selected",
                target: "Calendar-dates"
              }
            ];
          }*/
        }
        break;
      case "SELECT_NEXT":
        const nextNewDate = yearMonthDay(dayjs(state.date).add(1, "month"));
        newState = {
          ...state,
          date: nextNewDate,
          focusedDayNum: getFirstAvailableDay(nextNewDate, state)
        };
        break;
      case "SELECT_PREVIOUS":
        const previousNewDate = yearMonthDay(
          dayjs(state.date).subtract(1, "month")
        );
        newState = {
          ...state,
          date: previousNewDate,
          focusedDayNum: getFirstAvailableDay(previousNewDate, state)
        };
        break;
      case "FOCUS_DAY":
        newState = {
          ...state,
          focusedDayNum: action.payload.focused
        };
        break;
      case "KEY_UP":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) - 7, state, "up")
        };
        break;
      case "KEY_DOWN":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) + 7, state, "down")
        };
        break;
      case "KEY_RIGHT":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) + 1, state, "right")
        };
        break;
      case "KEY_LEFT":
        newState = {
          ...state,
          ...getNextDay(Number(state.focusedDayNum) - 1, state, "left")
        };
        break;
      default:
        newState = state;
    }

    newState.firstDay = getFirstDay(newState.date);
    newState.lastDay = getLastDay(newState.date);

    return newState;
  }, mergedState);

  return <Provider value={{ ...state, dispatch }}>{children}</Provider>;
};
